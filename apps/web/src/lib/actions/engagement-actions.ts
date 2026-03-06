"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import {
  addMessage,
  audit,
  createInvite,
  convertLeadToEngagement,
  createEngagement,
  getEngagementDetail,
  hasEngagementAccess,
  listCustomerRecipientsForEngagement,
  parseFeatureString,
  publishReport,
  registerAttachment,
  updateScenarioRunResult,
} from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { storeArtifact } from "@/lib/storage/provider";
import type { IdpProvider } from "@assurance/core";
import { dispatchJob } from "@/lib/jobs";
import { sendInviteEmail, sendReportPublishedEmail } from "@/lib/email";

async function requireActor() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

async function requireFounder() {
  const session = await requireActor();

  if (session.role !== "founder") {
    throw new Error("Founder access required.");
  }

  return session;
}

async function requireEngagementAccess(engagementId: string) {
  const session = await requireActor();
  const allowed = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId,
  });

  if (!allowed) {
    throw new Error("Engagement access denied.");
  }

  return session;
}

export async function convertLeadAction(formData: FormData) {
  const session = await requireFounder();
  const leadId = formData.get("leadId")?.toString() || "";
  await convertLeadToEngagement(leadId, session.name);
  revalidatePath("/app");
}

export async function createEngagementAction(formData: FormData) {
  const session = await requireFounder();
  const engagement = await createEngagement({
    title: formData.get("title")?.toString() || "",
    companyName: formData.get("companyName")?.toString() || "",
    productUrl: formData.get("productUrl")?.toString() || "",
    targetCustomer: formData.get("targetCustomer")?.toString() || "",
    targetIdp: (formData.get("targetIdp")?.toString() || "entra") as IdpProvider,
    deadline: formData.get("deadline")?.toString() || "",
    claimedFeatures: parseFeatureString(formData.get("claimedFeatures")?.toString() || ""),
    actorName: session.name,
  });
  revalidatePath("/app");
  revalidatePath(`/app/engagements/${engagement.id}`);
  return engagement;
}

export async function generateTestPlanAction(formData: FormData) {
  const session = await requireFounder();
  const engagementId = formData.get("engagementId")?.toString() || "";
  await dispatchJob({
    name: "test-plan.generate",
    data: {
      engagementId,
      actorName: session.name,
    },
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function updateScenarioResultAction(formData: FormData) {
  const engagementId = formData.get("engagementId")?.toString() || "";
  const session = await requireFounder();
  await updateScenarioRunResult({
    scenarioRunId: formData.get("scenarioRunId")?.toString() || "",
    outcome: (formData.get("outcome")?.toString() || "pending") as
      | "pending"
      | "passed"
      | "failed"
      | "skipped",
    reviewerNotes: formData.get("reviewerNotes")?.toString() || "",
    actorName: session.name,
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function addMessageAction(formData: FormData) {
  const engagementId = formData.get("engagementId")?.toString() || "";
  const session = await requireEngagementAccess(engagementId);
  const requestedVisibility = (formData.get("visibility")?.toString() || "shared") as
    | "shared"
    | "internal";
  const visibility = session.role === "founder" ? requestedVisibility : "shared";
  await addMessage({
    engagementId,
    authorName: session.name,
    body: formData.get("body")?.toString() || "",
    visibility,
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function uploadAttachmentAction(formData: FormData) {
  const engagementId = formData.get("engagementId")?.toString() || "";
  const session = await requireEngagementAccess(engagementId);
  const file = formData.get("file");
  const requestedVisibility = (formData.get("visibility")?.toString() || "shared") as
    | "shared"
    | "internal";
  const visibility = session.role === "founder" ? requestedVisibility : "shared";

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File is required.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const storageKey = `${engagementId}/${crypto.randomUUID()}-${file.name}`;
  await storeArtifact(storageKey, file.name, bytes, file.type || "application/octet-stream");
  await registerAttachment({
    engagementId,
    uploadedBy: session.name,
    visibility,
    fileName: file.name,
    storageKey,
    contentType: file.type || "application/octet-stream",
    size: file.size,
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function generateReportAction(formData: FormData) {
  const session = await requireFounder();
  const engagementId = formData.get("engagementId")?.toString() || "";
  await dispatchJob({
    name: "report.generate",
    data: {
      engagementId,
      actorName: session.name,
    },
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function publishReportAction(formData: FormData) {
  const session = await requireFounder();
  const reportId = formData.get("reportId")?.toString() || "";
  const engagementId = formData.get("engagementId")?.toString() || "";
  await publishReport(reportId, session.name);
  const detail = await getEngagementDetail(engagementId);

  if (detail) {
    assertAppUrlConfigured();
    const portalUrl = `${env.appUrl}/app/engagements/${engagementId}`;
    const recipients = await listCustomerRecipientsForEngagement(engagementId);

    for (const recipient of recipients) {
      const delivery = await sendReportPublishedEmail({
        to: recipient.email,
        recipientName: recipient.name,
        engagementTitle: detail.engagement.title,
        portalUrl,
      });
      await audit(session.name, "report_notification_processed", "report", reportId, {
        engagementId,
        recipientEmail: recipient.email,
        delivered: delivery.delivered,
        provider: delivery.provider,
      });
    }
  }

  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function createInviteAction(
  _previousState: { inviteUrl: string; error: string; deliveryMessage: string } | undefined,
  formData: FormData,
) {
  try {
    const session = await requireFounder();
    const engagementId = formData.get("engagementId")?.toString() || "";
    const created = await createInvite({
      email: formData.get("email")?.toString() || "",
      name: formData.get("name")?.toString() || "",
      role: "customer",
      engagementId,
      createdBy: session.name,
    });
    const detail = await getEngagementDetail(engagementId);
    const delivery = detail
      ? await sendInviteEmail({
          to: created.invite.email,
          inviteeName: created.invite.name,
          companyName: detail.engagement.companyName,
          engagementTitle: detail.engagement.title,
          inviteUrl: created.inviteUrl,
        })
      : {
          delivered: false,
          provider: "manual" as const,
          message: "Invite created. Email delivery skipped because the engagement could not be loaded.",
        };
    await audit(session.name, "invite_delivery_processed", "invite", created.invite.id, {
      engagementId,
      delivered: delivery.delivered,
      provider: delivery.provider,
    });
    revalidatePath(`/app/engagements/${engagementId}`);
    return {
      inviteUrl: created.inviteUrl,
      error: "",
      deliveryMessage: delivery.message,
    };
  } catch (error) {
    return {
      inviteUrl: "",
      error: error instanceof Error ? error.message : "Failed to create invite.",
      deliveryMessage: "",
    };
  }
}
