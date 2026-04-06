import type { AssuranceJob } from "@assurance/core";
import {
  generateReport,
  generateTestPlan,
  markJobCompleted,
  markJobFailed,
  markJobRunning,
  sendQueuedNotification,
} from "./data";

export async function executeQueuedJob(job: AssuranceJob) {
  try {
    await markJobRunning(job.data.jobRunId);

    if (job.name === "test-plan.generate") {
      if (!job.data.engagementId) {
        throw new Error("Test plan jobs require an engagement ID.");
      }
      await generateTestPlan(job.data.engagementId, job.data.actorName);
      const result = {
        engagementId: job.data.engagementId,
        type: job.name,
      };
      await markJobCompleted(job.data.jobRunId, result);
      return result;
    }

    if (job.name === "notification.send") {
      const delivery = await sendQueuedNotification(job.data.notificationId);
      const result = {
        engagementId: job.data.engagementId,
        notificationId: job.data.notificationId,
        delivered: delivery.delivered,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        type: job.name,
      };
      await markJobCompleted(job.data.jobRunId, result);
      return result;
    }

    if (!job.data.engagementId) {
      throw new Error("Report generation jobs require an engagement ID.");
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
