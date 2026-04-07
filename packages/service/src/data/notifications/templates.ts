import type { NotificationPayload } from "./types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildEmail(payload: NotificationPayload) {
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
