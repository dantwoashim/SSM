import type { AssuranceJob } from "@assurance/core";
import {
  generateReport,
  generateTestPlan,
  markJobCompleted,
  markJobFailed,
  markJobRunning,
} from "./data";

export async function executeQueuedJob(job: AssuranceJob) {
  try {
    await markJobRunning(job.data.jobRunId);

    if (job.name === "test-plan.generate") {
      await generateTestPlan(job.data.engagementId, job.data.actorName);
      const result = {
        engagementId: job.data.engagementId,
        type: job.name,
      };
      await markJobCompleted(job.data.jobRunId, result);
      return result;
    }

    await generateReport(job.data.engagementId, job.data.actorName);
    const result = {
      engagementId: job.data.engagementId,
      generatedAt: new Date().toISOString(),
      type: job.name,
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
}
