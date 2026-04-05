"use server";

import { redirect } from "next/navigation";
import { audit, createLead, enforceRateLimit } from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { sendLeadNotificationEmail } from "@/lib/email";
import { assertSameOriginRequest, getRequestIp } from "@/lib/request-context";
import { parseLeadForm, validationMessage } from "@/lib/validation";

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
  const delivery = await sendLeadNotificationEmail({
    companyName: parsed.companyName,
    targetCustomer: parsed.targetCustomer,
    targetIdp: parsed.targetIdp,
    dealStage: parsed.dealStage,
    leadUrl: `${env.appUrl}/app`,
  });
  await audit("system", "lead_notification_processed", "lead", lead.id, {
    delivered: delivery.delivered,
    provider: delivery.provider,
  });
}

export async function submitLeadAndRedirectAction(formData: FormData) {
  try {
    await submitLeadAction(formData);
    redirect("/intake?success=1");
  } catch (error) {
    redirect(`/intake?error=${encodeURIComponent(validationMessage(error))}`);
  }
}
