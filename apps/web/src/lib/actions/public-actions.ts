"use server";

import { redirect } from "next/navigation";
import { audit, createLead, enforceRateLimit } from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { queueNotification } from "@/lib/email";
import { assertSameOriginRequest, getRequestMetadata } from "@/lib/request-context";
import { parseLeadForm, validationMessage } from "@/lib/validation";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-errors";
import { dispatchNotificationJob } from "@/lib/jobs";
import { logError } from "@/lib/logger";

export async function submitLeadAction(formData: FormData) {
  await assertSameOriginRequest();
  const honeypot = formData.get("website")?.toString().trim();

  if (honeypot) {
    return;
  }

  const requestMeta = await getRequestMetadata();
  await enforceRateLimit({
    route: "lead-intake",
    bucketKey: `lead:${requestMeta.requestIp}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  const parsed = parseLeadForm(formData);

  const lead = await createLead({
    companyName: parsed.companyName,
    contactName: parsed.contactName,
    contactEmail: parsed.contactEmail,
    productUrl: parsed.productUrl,
    dealStage: parsed.dealStage,
    targetCustomer: parsed.targetCustomer,
    targetIdp: parsed.targetIdp,
    requiredFlows: parsed.requiredFlows,
    authNotes: parsed.authNotes,
    stagingAccessMethod: parsed.stagingAccessMethod,
    timeline: parsed.timeline,
    deadline: parsed.deadline,
  });

  assertAppUrlConfigured();
  const notification = await queueNotification({
    actorName: "system",
    idempotencyKey: `lead:${lead.id}`,
    payload: {
      type: "lead",
      to: env.notificationEmail || env.founderEmail,
      companyName: parsed.companyName,
      targetCustomer: parsed.targetCustomer,
      targetIdp: parsed.targetIdp,
      dealStage: parsed.dealStage,
      leadUrl: `${env.appUrl}/app`,
    },
  });
  const dispatchResult = await dispatchNotificationJob({
    actorName: "system",
    notificationId: notification.id,
  });
  await audit("system", "lead_notification_queued", "lead", lead.id, {
    actorRole: "system",
    notificationId: notification.id,
    requestId: requestMeta.requestId,
    requestIp: requestMeta.requestIp,
  });

  return {
    deliveryMessage:
      dispatchResult.mode === "queue"
        ? "Intake saved. Notification delivery has been queued."
        : "Intake saved. Notification handling completed during this request.",
  };
}

export async function submitLeadAndRedirectAction(formData: FormData) {
  try {
    const result = await submitLeadAction(formData);
    const params = new URLSearchParams({
      success: "1",
    });

    if (result?.deliveryMessage && !/successfully/i.test(result.deliveryMessage)) {
      params.set("warning", result.deliveryMessage);
    }

    redirect(`/intake?${params.toString()}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    const requestId = await getRequestIdSafe();
    logError("lead.submit_failed", error, {
      requestId,
    });
    redirect(`/intake?error=${encodeURIComponent(validationMessage(error))}`);
  }
}

async function getRequestIdSafe() {
  try {
    const meta = await getRequestMetadata();
    return meta.requestId;
  } catch {
    return "unknown";
  }
}
