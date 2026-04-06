import { type AssuranceJob, type DispatchableAssuranceJob } from "@assurance/core";
import { env } from "./env";
import { createJobRun, markJobFailed, markJobQueued } from "./data";
import { executeQueuedJob, sendQueuedNotification } from "@assurance/service";
import { getAssuranceQueue } from "./redis";

async function processInline(job: AssuranceJob) {
  const result = await executeQueuedJob(job);
  return {
    mode: "inline",
    ...result,
  } as const;
}

export async function dispatchJob(job: DispatchableAssuranceJob) {
  const jobRun = await createJobRun({
    engagementId: job.data.engagementId,
    name: job.name,
    actorName: job.data.actorName,
    payload: job.data,
  });
  const enrichedJob = {
    ...job,
    data: {
      ...job.data,
      jobRunId: jobRun.id,
    },
  } as AssuranceJob;

  if (!env.redisUrl) {
    try {
      return await processInline(enrichedJob);
    } catch (error) {
      await markJobFailed(
        jobRun.id,
        error instanceof Error ? error.message : "Inline job failed.",
      );
      throw error;
    }
  }

  const queue = getAssuranceQueue();

  if (!queue) {
    throw new Error("Redis queue is not available.");
  }

  try {
    const queued = await queue.add(enrichedJob.name, enrichedJob.data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    await markJobQueued(jobRun.id, queued.id || null);

    return {
      mode: "queue" as const,
      queueId: queued.id,
    };
  } catch (error) {
    await markJobFailed(
      jobRun.id,
      error instanceof Error ? error.message : "Queue enqueue failed.",
    );
    throw error;
  }
}

export async function dispatchNotificationJob(input: {
  engagementId?: string | null;
  actorName: string;
  notificationId: string;
}) {
  if (!input.engagementId) {
    queueMicrotask(() => {
      void sendQueuedNotification(input.notificationId).catch(() => undefined);
    });
    return {
      mode: "background" as const,
      notificationId: input.notificationId,
    };
  }

  return dispatchJob({
    name: "notification.send",
    data: {
      engagementId: input.engagementId,
      actorName: input.actorName,
      notificationId: input.notificationId,
    },
  });
}
