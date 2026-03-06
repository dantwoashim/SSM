import { assuranceQueueName, type AssuranceJob, type DispatchableAssuranceJob } from "@assurance/core";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import { generateReport, generateTestPlan } from "./data";
import {
  createJobRun,
  markJobCompleted,
  markJobFailed,
  markJobQueued,
  markJobRunning,
} from "./data";

async function processInline(job: AssuranceJob) {
  await markJobRunning(job.data.jobRunId);
  if (job.name === "test-plan.generate") {
    await generateTestPlan(job.data.engagementId, job.data.actorName);
    await markJobCompleted(job.data.jobRunId, {
      mode: "inline",
      type: job.name,
    });
    return { mode: "inline" as const };
  }

  await generateReport(job.data.engagementId, job.data.actorName);
  await markJobCompleted(job.data.jobRunId, {
    mode: "inline",
    type: job.name,
  });
  return { mode: "inline" as const };
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

  const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue(assuranceQueueName, { connection: connection as any });
  const queued = await queue.add(enrichedJob.name, enrichedJob.data);
  await markJobQueued(jobRun.id, queued.id || null);
  await queue.close();
  await connection.quit();

  return {
    mode: "queue" as const,
    queueId: queued.id,
  };
}
