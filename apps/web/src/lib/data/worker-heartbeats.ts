import { desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { makeId, now } from "./helpers";
import { workerHeartbeats } from "./schema";

export async function recordWorkerHeartbeat(input: {
  workerName: string;
  status: "starting" | "running" | "stopped";
  queueName?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(workerHeartbeats)
    .where(eq(workerHeartbeats.workerName, input.workerName))
    .limit(1);
  const timestamp = now();

  if (!existing) {
    const created = {
      id: makeId("worker"),
      workerName: input.workerName,
      status: input.status,
      queueName: input.queueName || null,
      startedAt: timestamp,
      lastSeenAt: timestamp,
      stoppedAt: input.status === "stopped" ? timestamp : null,
      metadata: input.metadata || {},
    };
    await db.insert(workerHeartbeats).values(created);
    return created;
  }

  const update = {
    status: input.status,
    queueName: input.queueName || existing.queueName,
    lastSeenAt: timestamp,
    stoppedAt: input.status === "stopped" ? timestamp : null,
    metadata: {
      ...(existing.metadata || {}),
      ...(input.metadata || {}),
    },
  };
  await db
    .update(workerHeartbeats)
    .set(update)
    .where(eq(workerHeartbeats.id, existing.id));

  return {
    ...existing,
    ...update,
  };
}

export async function getLatestWorkerHeartbeat() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workerHeartbeats)
    .orderBy(desc(workerHeartbeats.lastSeenAt))
    .limit(1);

  return rows[0] ?? null;
}
