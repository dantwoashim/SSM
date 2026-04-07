import { env } from "../../env";
import { logError, logEvent } from "../../logger";
import type { EmailDeliveryResult } from "./types";

function hasEmailDeliveryConfig() {
  return !!(env.resendApiKey && env.mailFrom);
}

export async function deliverEmail(message: {
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

export function emailDeliveryConfigured() {
  return hasEmailDeliveryConfig();
}
