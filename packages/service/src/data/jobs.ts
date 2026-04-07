import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import { jobRuns } from "./schema";
import { assertJobRunTransition } from "./workflow";

export async function createJobRun(input: {
  engagementId?: string | null;
  name: string;
  actorName: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string | null;
}) {
  const db = await getDb();
  const timestamp = now();
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(jobRuns)
      .where(
        and(
          eq(jobRuns.idempotencyKey, input.idempotencyKey),
          inArray(jobRuns.status, ["queued", "running"]),
        ),
      )
      .limit(1);

    if (existing) {
      return {
        jobRun: existing,
        created: false as const,
      };
    }
  }

  const jobRun = {
    id: makeId("job"),
    engagementId: input.engagementId || null,
    name: input.name,
    status: "queued",
    queueId: null,
    idempotencyKey: input.idempotencyKey || null,
    payload: input.payload,
    result: null,
    error: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };

  try {
    await db.insert(jobRuns).values(jobRun);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (input.idempotencyKey && /job_runs_active_idempotency_idx|duplicate|unique/i.test(message)) {
      const [existing] = await db
        .select()
        .from(jobRuns)
        .where(
          and(
            eq(jobRuns.idempotencyKey, input.idempotencyKey),
            inArray(jobRuns.status, ["queued", "running"]),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          jobRun: existing,
          created: false as const,
        };
      }
    }

    throw error;
  }
  await audit(input.actorName, "created_job_run", "job_run", jobRun.id, {
    engagementId: input.engagementId,
    name: input.name,
    idempotencyKey: input.idempotencyKey || null,
  });
  return {
    jobRun,
    created: true as const,
  };
}

export async function markJobQueued(jobRunId: string, queueId: string | null) {
  const db = await getDb();
  const [current] = await db.select().from(jobRuns).where(eq(jobRuns.id, jobRunId)).limit(1);

  if (!current) {
    throw new Error("Job run not found.");
  }

  assertJobRunTransition(current.status, "queued");
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
  const [current] = await db.select().from(jobRuns).where(eq(jobRuns.id, jobRunId)).limit(1);

  if (!current) {
    throw new Error("Job run not found.");
  }

  assertJobRunTransition(current.status, "running");
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
  const [current] = await db.select().from(jobRuns).where(eq(jobRuns.id, jobRunId)).limit(1);

  if (!current) {
    throw new Error("Job run not found.");
  }

  assertJobRunTransition(current.status, "completed");
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
  const [current] = await db.select().from(jobRuns).where(eq(jobRuns.id, jobRunId)).limit(1);

  if (!current) {
    throw new Error("Job run not found.");
  }

  assertJobRunTransition(current.status, "failed");
  await db
    .update(jobRuns)
    .set({
      status: "failed",
      error: errorMessage,
      updatedAt: now(),
    })
    .where(eq(jobRuns.id, jobRunId));
}
