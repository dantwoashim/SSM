import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
import { notificationOutbox } from "../schema";
import { assertNotificationTransition } from "../workflow";
import { buildEmail } from "./templates";
import { deliverEmail, emailDeliveryConfigured } from "./transport-resend";
import type { EmailDeliveryResult, NotificationPayload } from "./types";

export async function queueNotification(input: {
  engagementId?: string | null;
  actorName: string;
  payload: NotificationPayload;
  idempotencyKey?: string | null;
}) {
  const db = await getDb();
  const timestamp = now();
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      return existing;
    }
  }

  const notification = {
    id: makeId("notify"),
    engagementId: input.engagementId || null,
    kind: input.payload.type,
    payload: input.payload,
    status: "queued",
    attemptCount: 0,
    reservedAt: null,
    idempotencyKey: input.idempotencyKey || null,
    manualAction: null,
    lastError: null,
    provider: null,
    providerMessageId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deliveredAt: null,
  };

  await db.insert(notificationOutbox).values(notification);
  await audit(input.actorName, "queued_notification", "notification", notification.id, {
    engagementId: input.engagementId || null,
    kind: input.payload.type,
    recipient: input.payload.to,
  });
  return notification;
}

export async function getNotificationById(notificationId: string) {
  const db = await getDb();
  const [notification] = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.id, notificationId))
    .limit(1);
  return notification ?? null;
}

export async function sendQueuedNotification(notificationId: string) {
  const leaseOwner = `sender-${process.pid}`;
  const leaseToken = crypto.randomUUID();
  const db = await getDb();
  const [current] = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.id, notificationId))
    .limit(1);

  if (!current) {
    throw new Error("Notification not found.");
  }

  if (current.status === "sent") {
    return {
      delivered: true,
      provider: current.provider || "manual",
      message: "Notification already delivered.",
      providerMessageId: current.providerMessageId,
    } as EmailDeliveryResult;
  }

  if (current.status === "manual_action_required" || current.status === "failed_terminal") {
    return {
      delivered: false,
      provider: "manual",
      message: current.manualAction || current.lastError || "Manual delivery is required.",
      providerMessageId: current.providerMessageId,
    };
  }

  if (current.status === "sending") {
    return {
      delivered: false,
      provider: current.provider || "manual",
      message: "Notification delivery is already in progress.",
      providerMessageId: current.providerMessageId,
    };
  }

  assertNotificationTransition(current.status, "sending");
  const reservedAt = now();
  const [reserved] = await db
    .update(notificationOutbox)
    .set({
      status: "sending",
      attemptCount: sql`${notificationOutbox.attemptCount} + 1`,
      reservedAt,
      leaseToken,
      leaseOwner,
      manualAction: null,
      lastError: null,
      updatedAt: reservedAt,
    })
    .where(and(eq(notificationOutbox.id, notificationId), eq(notificationOutbox.status, "queued")))
    .returning();

  if (!reserved) {
    const fresh = await getNotificationById(notificationId);
    if (!fresh) {
      throw new Error("Notification not found.");
    }

    if (fresh.status === "sending") {
      return {
        delivered: false,
        provider: fresh.provider || "manual",
        message: "Notification delivery is already in progress.",
        providerMessageId: fresh.providerMessageId,
      };
    }

    if (fresh.status === "sent") {
      return {
        delivered: true,
        provider: fresh.provider || "manual",
        message: "Notification already delivered.",
        providerMessageId: fresh.providerMessageId,
      };
    }

    if (fresh.status === "manual_action_required" || fresh.status === "failed_terminal") {
      return {
        delivered: false,
        provider: "manual",
        message: fresh.manualAction || fresh.lastError || "Manual delivery is required.",
        providerMessageId: fresh.providerMessageId,
      };
    }

    throw new Error("Notification delivery could not acquire a send lease.");
  }

  try {
    const delivery = await deliverEmail(buildEmail(reserved.payload as NotificationPayload));
    const timestamp = now();

    assertNotificationTransition("sending", delivery.delivered ? "sent" : "manual_action_required");
    await db
      .update(notificationOutbox)
      .set({
        status: delivery.delivered ? "sent" : "manual_action_required",
        manualAction: delivery.delivered ? null : delivery.message,
        lastError: delivery.delivered ? null : delivery.message,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        updatedAt: timestamp,
        reservedAt: null,
        leaseToken: null,
        leaseOwner: null,
        deliveredAt: delivery.delivered ? timestamp : null,
      })
      .where(
        and(
          eq(notificationOutbox.id, reserved.id),
          eq(notificationOutbox.leaseToken, leaseToken),
          eq(notificationOutbox.status, "sending"),
        ),
      );

    return delivery;
  } catch (error) {
    const nextAttemptCount = (reserved.attemptCount || 0);
    const terminal = nextAttemptCount >= 3;
    const nextStatus = terminal ? "failed_terminal" : "queued";
    assertNotificationTransition("sending", nextStatus);
    await db
      .update(notificationOutbox)
      .set({
        status: nextStatus,
        lastError: error instanceof Error ? error.message : "Notification delivery failed.",
        manualAction: terminal
          ? "Delivery failed repeatedly. Review the provider response and send this notification manually."
          : null,
        updatedAt: now(),
        reservedAt: null,
        leaseToken: null,
        leaseOwner: null,
      })
      .where(
        and(
          eq(notificationOutbox.id, reserved.id),
          eq(notificationOutbox.leaseToken, leaseToken),
          eq(notificationOutbox.status, "sending"),
        ),
      );
    throw error;
  }
}

export async function listNotificationsForEngagement(engagementId: string) {
  const db = await getDb();
  return db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.engagementId, engagementId));
}

export { emailDeliveryConfigured };
