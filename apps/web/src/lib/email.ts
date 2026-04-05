import { env } from "./env";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  provider: "resend" | "manual";
  message: string;
}

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

async function deliverEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  if (!hasEmailDeliveryConfig()) {
    return {
      delivered: false,
      provider: "manual",
      message: "Email delivery is not configured. Share the generated link manually.",
    };
  }

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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }

  return {
    delivered: true,
    provider: "resend",
    message: "Email sent successfully.",
  };
}

export async function sendInviteEmail(input: {
  to: string;
  inviteeName: string;
  companyName: string;
  engagementTitle: string;
  inviteUrl: string;
}) {
  return deliverEmail({
    to: input.to,
    subject: `Access your ${input.companyName} assurance portal`,
    text: [
      `Hi ${input.inviteeName},`,
      "",
      `You have been invited to review the engagement portal for ${input.engagementTitle}.`,
      `Activate your access here: ${input.inviteUrl}`,
      "",
      "This portal contains assurance updates, artifacts, and published reports for the scoped rollout.",
    ].join("\n"),
    html: `
      <p>Hi ${escapeHtml(input.inviteeName)},</p>
      <p>You have been invited to review the engagement portal for <strong>${escapeHtml(input.engagementTitle)}</strong>.</p>
      <p><a href="${escapeHtml(input.inviteUrl)}">Activate your access</a></p>
      <p>This portal contains assurance updates, artifacts, and published reports for the scoped rollout.</p>
    `,
  });
}

export async function sendLeadNotificationEmail(input: {
  companyName: string;
  targetCustomer: string;
  targetIdp: string;
  dealStage: string;
  leadUrl: string;
}) {
  return deliverEmail({
    to: env.notificationEmail || env.founderEmail,
    subject: `New Deal Rescue intake: ${input.companyName}`,
    text: [
      "A new public intake was submitted.",
      "",
      `Company: ${input.companyName}`,
      `Target customer: ${input.targetCustomer}`,
      `Target IdP: ${input.targetIdp}`,
      `Deal stage: ${input.dealStage}`,
      `Review: ${input.leadUrl}`,
    ].join("\n"),
    html: `
      <p>A new public intake was submitted.</p>
      <ul>
        <li><strong>Company:</strong> ${escapeHtml(input.companyName)}</li>
        <li><strong>Target customer:</strong> ${escapeHtml(input.targetCustomer)}</li>
        <li><strong>Target IdP:</strong> ${escapeHtml(input.targetIdp)}</li>
        <li><strong>Deal stage:</strong> ${escapeHtml(input.dealStage)}</li>
      </ul>
      <p><a href="${escapeHtml(input.leadUrl)}">Open the founder dashboard</a></p>
    `,
  });
}

export async function sendReportPublishedEmail(input: {
  to: string;
  recipientName: string;
  engagementTitle: string;
  portalUrl: string;
}) {
  return deliverEmail({
    to: input.to,
    subject: `New assurance report available for ${input.engagementTitle}`,
    text: [
      `Hi ${input.recipientName},`,
      "",
      `A new assurance report is available for ${input.engagementTitle}.`,
      `Review it here: ${input.portalUrl}`,
    ].join("\n"),
    html: `
      <p>Hi ${escapeHtml(input.recipientName)},</p>
      <p>A new assurance report is available for <strong>${escapeHtml(input.engagementTitle)}</strong>.</p>
      <p><a href="${escapeHtml(input.portalUrl)}">Open the engagement portal</a></p>
    `,
  });
}

export function emailDeliveryConfigured() {
  return hasEmailDeliveryConfig();
}
