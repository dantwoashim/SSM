import { auditLogs } from "./schema";
import { getDb } from "./client";
import { makeId, now } from "./helpers";

export async function audit(
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
  executor?: any,
) {
  const db = executor || (await getDb());
  await db.insert(auditLogs).values({
    id: makeId("audit"),
    actorName,
    action,
    entityType,
    entityId,
    metadata,
    createdAt: now(),
  });
}
