import {
  assuranceQueueName,
  sampleReportSnapshot,
  selectScenarios,
  type AssuranceJob,
} from "@assurance/core";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { generateReport, generateTestPlan } from "../../../apps/web/src/lib/data";
import {
  markJobCompleted,
  markJobFailed,
  markJobRunning,
} from "../../../apps/web/src/lib/data";

async function main() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
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

  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const worker = new Worker<AssuranceJob["data"]>(
    assuranceQueueName,
    async (job) => {
      try {
        await markJobRunning(job.data.jobRunId);

        if (job.name === "test-plan.generate") {
          await generateTestPlan(job.data.engagementId, job.data.actorName);
          const result = {
            engagementId: job.data.engagementId,
            status: "completed",
          };
          await markJobCompleted(job.data.jobRunId, result);
          return result;
        }

        await generateReport(job.data.engagementId, job.data.actorName);
        const result = {
          engagementId: job.data.engagementId,
          generatedAt: new Date().toISOString(),
        };
        await markJobCompleted(job.data.jobRunId, result);
        return result;
      } catch (error) {
        await markJobFailed(
          job.data.jobRunId,
          error instanceof Error ? error.message : "Worker job failed.",
        );
        throw error;
      }
    },
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
