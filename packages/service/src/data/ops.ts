import { and, count, desc, eq, isNull, ne, or } from "drizzle-orm";
import { getDb } from "./client";
import { attachments, jobRuns, notificationOutbox, workerHeartbeats } from "./schema";

export async function getOperationsSnapshot() {
  const db = await getDb();
  const [{ value: failedJobCount }] = await db
    .select({ value: count() })
    .from(jobRuns)
    .where(eq(jobRuns.status, "failed"));
  const [{ value: queuedNotificationCount }] = await db
    .select({ value: count() })
    .from(notificationOutbox)
    .where(or(eq(notificationOutbox.status, "queued"), eq(notificationOutbox.status, "sending")));
  const [{ value: manualNotificationCount }] = await db
    .select({ value: count() })
    .from(notificationOutbox)
    .where(or(eq(notificationOutbox.status, "manual_action_required"), eq(notificationOutbox.status, "failed_terminal")));
  const [{ value: reviewAttachmentCount }] = await db
    .select({ value: count() })
    .from(attachments)
    .where(eq(attachments.scanStatus, "manual-review-required"));
  const failedJobs = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.status, "failed"))
    .orderBy(desc(jobRuns.updatedAt))
    .limit(10);
  const queuedNotifications = await db
    .select()
    .from(notificationOutbox)
    .where(or(eq(notificationOutbox.status, "queued"), eq(notificationOutbox.status, "sending")))
    .orderBy(desc(notificationOutbox.updatedAt))
    .limit(10);
  const reviewAttachments = await db
    .select()
    .from(attachments)
    .where(andNotDeleted(ne(attachments.scanStatus, "clean")))
    .orderBy(desc(attachments.createdAt))
    .limit(10);
  const heartbeats = await db
    .select()
    .from(workerHeartbeats)
    .orderBy(desc(workerHeartbeats.lastSeenAt))
    .limit(10);

  return {
    failedJobCount: Number(failedJobCount),
    queuedNotificationCount: Number(queuedNotificationCount),
    manualNotificationCount: Number(manualNotificationCount),
    reviewAttachmentCount: Number(reviewAttachmentCount),
    failedJobs,
    queuedNotifications,
    reviewAttachments,
    heartbeats,
  };
}

function andNotDeleted(condition: ReturnType<typeof ne>) {
  return and(condition, isNull(attachments.deletedAt));
}
