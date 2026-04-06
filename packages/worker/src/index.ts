import {
  assuranceQueueName,
  sampleReportSnapshot,
  selectScenarios,
  type AssuranceJob,
} from "@assurance/core";
import { executeQueuedJob, logError, logEvent, recordWorkerHeartbeat } from "@assurance/service";
import { Worker } from "bullmq";
import IORedis from "ioredis";

const workerName = process.env.WORKER_NAME || `assurance-worker-${process.pid}`;

async function sendHeartbeat(status: "starting" | "running" | "stopped", metadata: Record<string, unknown> = {}) {
  await recordWorkerHeartbeat({
    workerName,
    status,
    queueName: assuranceQueueName,
    metadata,
  });
}

async function main() {
  const redisUrl = process.env.REDIS_URL;
  const workerPreview = process.env.WORKER_PREVIEW === "1";

  if (!redisUrl) {
    if (!workerPreview) {
      throw new Error(
        "REDIS_URL must be configured for worker execution. Set WORKER_PREVIEW=1 only for local preview mode.",
      );
    }

    logEvent("info", "worker.preview", { workerName });
    console.log(
      "Preview scenarios:",
      selectScenarios("entra", [
        "sp-initiated-sso",
        "scim-create",
        "scim-deactivate",
      ]).map((scenario) => scenario.title),
    );
    console.log("Preview report:", sampleReportSnapshot.engagementTitle);
    return;
  }

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  await sendHeartbeat("starting", { pid: process.pid });
  const worker = new Worker<AssuranceJob["data"]>(
    assuranceQueueName,
    async (job) => executeQueuedJob(job as AssuranceJob),
    { connection: connection as any },
  );
  const heartbeatInterval = setInterval(() => {
    void sendHeartbeat("running", { pid: process.pid }).catch((error) => {
      logError("worker.heartbeat_failed", error, { workerName });
    });
  }, 30000);
  logEvent("info", "worker.started", { workerName, queueName: assuranceQueueName });

  worker.on("completed", (job, result) => {
    logEvent("info", "worker.job_completed", {
      workerName,
      jobName: job.name,
      jobId: job.id,
      result,
    });
  });

  worker.on("failed", (job, error) => {
    logError("worker.job_failed", error, {
      workerName,
      jobName: job?.name || "unknown",
      jobId: job?.id || null,
    });
  });

  const shutdown = async (signal: string) => {
    clearInterval(heartbeatInterval);
    await sendHeartbeat("stopped", { signal, pid: process.pid }).catch((error) => {
      logError("worker.shutdown_heartbeat_failed", error, { workerName, signal });
    });
    await worker.close().catch((error) => {
      logError("worker.close_failed", error, { workerName, signal });
    });
    await connection.quit().catch((error) => {
      logError("worker.redis_quit_failed", error, { workerName, signal });
    });
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  logError("worker.start_failed", error, { workerName });
  process.exit(1);
});
