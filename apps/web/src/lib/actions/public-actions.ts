"use server";

import { redirect } from "next/navigation";
import { audit, createLead, enforceRateLimit } from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { queueNotification } from "@/lib/email";
import { assertSameOriginRequest, getRequestIp } from "@/lib/request-context";
import { parseLeadForm, validationMessage } from "@/lib/validation";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-errors";
import { dispatchNotificationJob } from "@/lib/jobs";

export async function submitLeadAction(formData: FormData) {
  await assertSameOriginRequest();
  const honeypot = formData.get("website")?.toString().trim();

  if (honeypot) {
    return;
  }

  const ip = await getRequestIp();
  await enforceRateLimit({
    route: "lead-intake",
    bucketKey: `lead:${ip}`,
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
  await dispatchNotificationJob({
    actorName: "system",
    notificationId: notification.id,
  });
  await audit("system", "lead_notification_queued", "lead", lead.id, {
    notificationId: notification.id,
  });

  return {
    deliveryMessage: "Intake saved. Notification delivery is being processed in the background.",
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
    redirect(`/intake?error=${encodeURIComponent(validationMessage(error))}`);
  }
}
