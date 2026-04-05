import {
  assuranceQueueName,
  sampleReportSnapshot,
  selectScenarios,
  type AssuranceJob,
} from "@assurance/core";
import { Worker } from "bullmq";
import IORedis from "ioredis";

const webAppUrl = process.env.WEB_APP_URL || process.env.APP_URL || "";
const jobExecutorToken = process.env.JOB_EXECUTOR_TOKEN || "";

async function executeJob(job: AssuranceJob) {
  if (!webAppUrl) {
    throw new Error("WEB_APP_URL or APP_URL must be configured for worker execution.");
  }

  if (!jobExecutorToken) {
    throw new Error("JOB_EXECUTOR_TOKEN must be configured for worker execution.");
  }

  const response = await fetch(`${webAppUrl.replace(/\/$/, "")}/api/internal/jobs/execute`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-assurance-queue": assuranceQueueName,
      "x-job-executor-token": jobExecutorToken,
    },
    body: JSON.stringify(job),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; error?: string; result?: Record<string, unknown> }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `Worker execution failed with status ${response.status}.`);
  }

  return payload.result ?? {};
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

    console.log("REDIS_URL not set. Running worker in preview mode.");
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

  if (!webAppUrl) {
    throw new Error("WEB_APP_URL or APP_URL must be configured for worker execution.");
  }

  if (!jobExecutorToken) {
    throw new Error("JOB_EXECUTOR_TOKEN must be configured for worker execution.");
  }

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const worker = new Worker<AssuranceJob["data"]>(
    assuranceQueueName,
    async (job) => executeJob(job as AssuranceJob),
    { connection: connection as any },
  );

  worker.on("completed", (job, result) => {
    console.log(`Completed ${job.name}`, result);
  });

  worker.on("failed", (job, error) => {
    console.error(`Failed ${job?.name}`, error);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
