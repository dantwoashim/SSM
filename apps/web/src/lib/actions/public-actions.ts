"use server";

import type { ClaimedFeature, IdpProvider } from "@assurance/core";
import { createLead } from "@/lib/data";
import { audit } from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { sendLeadNotificationEmail } from "@/lib/email";

export async function submitLeadAction(formData: FormData) {
  const requiredFlows = formData
    .get("requiredFlows")
    ?.toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ClaimedFeature[];

  const lead = await createLead({
    companyName: formData.get("companyName")?.toString() || "",
    contactName: formData.get("contactName")?.toString() || "",
    contactEmail: formData.get("contactEmail")?.toString() || "",
    productUrl: formData.get("productUrl")?.toString() || "",
    dealStage: formData.get("dealStage")?.toString() || "",
    targetCustomer: formData.get("targetCustomer")?.toString() || "",
    targetIdp: (formData.get("targetIdp")?.toString() || "entra") as IdpProvider,
    requiredFlows,
    authNotes: formData.get("authNotes")?.toString() || "",
    stagingAccessMethod: formData.get("stagingAccessMethod")?.toString() || "",
    timeline: formData.get("timeline")?.toString() || "",
    deadline: formData.get("deadline")?.toString() || "",
  });

  assertAppUrlConfigured();
  const delivery = await sendLeadNotificationEmail({
    companyName: formData.get("companyName")?.toString() || "",
    targetCustomer: formData.get("targetCustomer")?.toString() || "",
    targetIdp: formData.get("targetIdp")?.toString() || "entra",
    dealStage: formData.get("dealStage")?.toString() || "",
    leadUrl: `${env.appUrl}/app`,
  });
  await audit("system", "lead_notification_processed", "lead", lead.id, {
    delivered: delivery.delivered,
    provider: delivery.provider,
  });

  return { leadId: lead.id };
}
