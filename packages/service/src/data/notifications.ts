import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import { notificationOutbox } from "./schema";
import { env } from "../env";
import { logError, logEvent } from "../logger";

export interface EmailDeliveryResult {
  delivered: boolean;
  provider: "resend" | "manual";
  message: string;
  providerMessageId: string | null;
}

type InviteNotificationPayload = {
  type: "invite";
  to: string;
  inviteeName: string;
  companyName: string;
  engagementTitle: string;
  inviteUrl: string;
};

type LeadNotificationPayload = {
  type: "lead";
  to: string;
  companyName: string;
  targetCustomer: string;
  targetIdp: string;
  dealStage: string;
  leadUrl: string;
};

type ReportNotificationPayload = {
  type: "report-published";
  to: string;
  recipientName: string;
  engagementTitle: string;
  portalUrl: string;
};

export type NotificationPayload =
  | InviteNotificationPayload
  | LeadNotificationPayload
  | ReportNotificationPayload;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hasEmailDeliveryConfig() {
  return !!(env.resendApiKey && env.mailFrom);
}

async function deliverEmail(message: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<EmailDeliveryResult> {
  if (!hasEmailDeliveryConfig()) {
    return {
      delivered: false,
      provider: "manual",
      message: "Email delivery is not configured. Share the generated link manually.",
      providerMessageId: null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.mailFrom,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo || env.mailReplyTo || undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email delivery failed: ${errorText}`);
    }

    const payload = (await response.json().catch(() => null)) as { id?: string } | null;
    logEvent("info", "email.sent", {
      provider: "resend",
      to: message.to,
      subject: message.subject,
      providerMessageId: payload?.id || null,
    });

    return {
      delivered: true,
      provider: "resend",
      message: "Email sent successfully.",
      providerMessageId: payload?.id || null,
    };
  } catch (error) {
    logError("email.failed", error, {
      provider: "resend",
      to: message.to,
      subject: message.subject,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildEmail(payload: NotificationPayload) {
  if (payload.type === "invite") {
    return {
      to: payload.to,
      subject: `Access your ${payload.companyName} assurance portal`,
      text: [
        `Hi ${payload.inviteeName},`,
        "",
        `You have been invited to review the engagement portal for ${payload.engagementTitle}.`,
        `Activate your access here: ${payload.inviteUrl}`,
        "",
        "This portal contains assurance updates, artifacts, and published reports for the scoped rollout.",
      ].join("\n"),
      html: `
        <p>Hi ${escapeHtml(payload.inviteeName)},</p>
        <p>You have been invited to review the engagement portal for <strong>${escapeHtml(payload.engagementTitle)}</strong>.</p>
        <p><a href="${escapeHtml(payload.inviteUrl)}">Activate your access</a></p>
        <p>This portal contains assurance updates, artifacts, and published reports for the scoped rollout.</p>
      `,
    };
  }

  if (payload.type === "lead") {
    return {
      to: payload.to,
      subject: `New Deal Rescue intake: ${payload.companyName}`,
      text: [
        "A new public intake was submitted.",
        "",
        `Company: ${payload.companyName}`,
        `Target customer: ${payload.targetCustomer}`,
        `Target IdP: ${payload.targetIdp}`,
        `Deal stage: ${payload.dealStage}`,
        `Review: ${payload.leadUrl}`,
      ].join("\n"),
      html: `
        <p>A new public intake was submitted.</p>
        <ul>
          <li><strong>Company:</strong> ${escapeHtml(payload.companyName)}</li>
          <li><strong>Target customer:</strong> ${escapeHtml(payload.targetCustomer)}</li>
          <li><strong>Target IdP:</strong> ${escapeHtml(payload.targetIdp)}</li>
          <li><strong>Deal stage:</strong> ${escapeHtml(payload.dealStage)}</li>
        </ul>
        <p><a href="${escapeHtml(payload.leadUrl)}">Open the founder dashboard</a></p>
      `,
    };
  }

  return {
    to: payload.to,
    subject: `New assurance report available for ${payload.engagementTitle}`,
    text: [
      `Hi ${payload.recipientName},`,
      "",
      `A new assurance report is available for ${payload.engagementTitle}.`,
      `Review it here: ${payload.portalUrl}`,
    ].join("\n"),
    html: `
      <p>Hi ${escapeHtml(payload.recipientName)},</p>
      <p>A new assurance report is available for <strong>${escapeHtml(payload.engagementTitle)}</strong>.</p>
      <p><a href="${escapeHtml(payload.portalUrl)}">Open the engagement portal</a></p>
    `,
  };
}

export async function queueNotification(input: {
  engagementId?: string | null;
  actorName: string;
  payload: NotificationPayload;
}) {
  const db = await getDb();
  const timestamp = now();
  const notification = {
    id: makeId("notify"),
    engagementId: input.engagementId || null,
    kind: input.payload.type,
    payload: input.payload,
    status: "queued",
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
  const db = await getDb();
  const notification = await getNotificationById(notificationId);

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.status === "sent") {
    return {
      delivered: true,
      provider: notification.provider || "manual",
      message: "Notification already delivered.",
      providerMessageId: notification.providerMessageId,
    } as EmailDeliveryResult;
  }

  await db
    .update(notificationOutbox)
    .set({
      status: "sending",
      lastError: null,
      updatedAt: now(),
    })
    .where(eq(notificationOutbox.id, notification.id));

  try {
    const delivery = await deliverEmail(buildEmail(notification.payload as NotificationPayload));
    const timestamp = now();
    await db
      .update(notificationOutbox)
      .set({
        status: delivery.delivered ? "sent" : "queued",
        lastError: delivery.delivered ? null : delivery.message,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId,
        updatedAt: timestamp,
        deliveredAt: delivery.delivered ? timestamp : null,
      })
      .where(eq(notificationOutbox.id, notification.id));

    return delivery;
  } catch (error) {
    await db
      .update(notificationOutbox)
      .set({
        status: "failed",
        lastError: error instanceof Error ? error.message : "Notification delivery failed.",
        updatedAt: now(),
      })
      .where(eq(notificationOutbox.id, notification.id));
    throw error;
  }
}

export function emailDeliveryConfigured() {
  return hasEmailDeliveryConfig();
}
