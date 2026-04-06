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
  const actorId = typeof metadata.actorId === "string" ? metadata.actorId : null;
  const actorRole = typeof metadata.actorRole === "string" ? metadata.actorRole : null;
  const requestId = typeof metadata.requestId === "string" ? metadata.requestId : null;
  const requestIp = typeof metadata.requestIp === "string" ? metadata.requestIp : null;
  await db.insert(auditLogs).values({
    id: makeId("audit"),
    actorName,
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    requestId,
    requestIp,
    createdAt: now(),
  });
}
