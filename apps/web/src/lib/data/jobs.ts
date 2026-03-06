import { desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import { jobRuns } from "./schema";

export async function createJobRun(input: {
  engagementId: string;
  name: string;
  actorName: string;
  payload: Record<string, unknown>;
}) {
  const db = await getDb();
  const timestamp = now();
  const jobRun = {
    id: makeId("job"),
    engagementId: input.engagementId,
    name: input.name,
    status: "queued",
    queueId: null,
    payload: input.payload,
    result: null,
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };

  await db.insert(jobRuns).values(jobRun);
  await audit(input.actorName, "created_job_run", "job_run", jobRun.id, {
    engagementId: input.engagementId,
    name: input.name,
  });
  return jobRun;
}

export async function markJobQueued(jobRunId: string, queueId: string | null) {
  const db = await getDb();
  await db
    .update(jobRuns)
    .set({
      status: "queued",
      queueId,
      updatedAt: now(),
    })
    .where(eq(jobRuns.id, jobRunId));
}

export async function markJobRunning(jobRunId: string) {
  const db = await getDb();
  await db
    .update(jobRuns)
    .set({
      status: "running",
      updatedAt: now(),
    })
    .where(eq(jobRuns.id, jobRunId));
}

export async function markJobCompleted(jobRunId: string, result: Record<string, unknown> = {}) {
  const db = await getDb();
  const timestamp = now();
  await db
    .update(jobRuns)
    .set({
      status: "completed",
      result,
      error: null,
      updatedAt: timestamp,
      completedAt: timestamp,
    })
    .where(eq(jobRuns.id, jobRunId));
}

export async function markJobFailed(jobRunId: string, errorMessage: string) {
  const db = await getDb();
  await db
    .update(jobRuns)
    .set({
      status: "failed",
      error: errorMessage,
      updatedAt: now(),
    })
    .where(eq(jobRuns.id, jobRunId));
}

export async function listJobRunsForEngagement(engagementId: string) {
  const db = await getDb();
  return db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.engagementId, engagementId))
    .orderBy(desc(jobRuns.createdAt));
}
