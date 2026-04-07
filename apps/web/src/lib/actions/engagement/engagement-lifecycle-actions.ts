"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  convertLeadToEngagement,
  createEngagement,
} from "@/lib/data";
import { dispatchJob } from "@/lib/jobs";
import {
  parseCreateEngagementForm,
  parseJobActionForm,
  validationMessage,
} from "@/lib/validation";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-errors";
import { requireFounder } from "./shared";

export async function convertLeadAction(formData: FormData) {
  const session = await requireFounder();
  const leadId = parseJobActionForm(formData, "leadId");
  await convertLeadToEngagement(leadId, session.name, session.sub);
  revalidatePath("/app");
}

export async function createEngagementAction(formData: FormData) {
  const session = await requireFounder();
  const parsed = parseCreateEngagementForm(formData);
  const engagement = await createEngagement({
    title: parsed.title,
    companyName: parsed.companyName,
    productUrl: parsed.productUrl,
    targetCustomer: parsed.targetCustomer,
    targetIdp: parsed.targetIdp,
    deadline: parsed.deadline,
    claimedFeatures: parsed.claimedFeatures,
    actorName: session.name,
    ownerUserId: session.sub,
  });
  revalidatePath("/app");
  revalidatePath(`/app/engagements/${engagement.id}`);
  return engagement;
}

export async function createEngagementAndRedirectAction(formData: FormData) {
  try {
    const engagement = await createEngagementAction(formData);
    redirect(`/app/engagements/${engagement.id}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    const params = new URLSearchParams({
      error: validationMessage(error),
    });
    redirect(`/app/engagements/new?${params.toString()}`);
  }
}

export async function generateTestPlanAction(formData: FormData) {
  const session = await requireFounder();
  const engagementId = parseJobActionForm(formData);
  await dispatchJob({
    name: "test-plan.generate",
    data: {
      engagementId,
      actorName: session.name,
    },
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function generateReportAction(formData: FormData) {
  const session = await requireFounder();
  const engagementId = parseJobActionForm(formData);
  await dispatchJob({
    name: "report.generate",
    data: {
      engagementId,
      actorName: session.name,
    },
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}
