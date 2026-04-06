"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import {
  addMessage,
  addManualScenario,
  audit,
  createInvite,
  convertLeadToEngagement,
  createEngagement,
  getEngagementDetail,
  hasEngagementAccess,
  listCustomerRecipientsForEngagement,
  publishReport,
  registerAttachment,
  updateScenarioRunResult,
} from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { assertSameOriginRequest } from "@/lib/request-context";
import { setEngagementFlashCookie } from "@/lib/engagement-flash";
import { storeArtifact } from "@/lib/storage/provider";
import type { IdpProvider } from "@assurance/core";
import { dispatchJob } from "@/lib/jobs";
import { logError } from "@/lib/logger";
import { queueNotification } from "@/lib/email";
import { dispatchNotificationJob } from "@/lib/jobs";
import {
  parseAttachmentLinkage,
  parseCreateEngagementForm,
  parseInviteForm,
  parseJobActionForm,
  parseManualScenarioForm,
  parseMessageForm,
  parsePublishReportForm,
  parseScenarioReviewForm,
  parseVisibility,
  sanitizeAttachmentFileName,
  validateAttachmentContent,
  validationMessage,
  validateAttachmentUpload,
} from "@/lib/validation";
import { rethrowIfRedirectError } from "@/lib/actions/redirect-errors";

async function requireActor() {
  await assertSameOriginRequest();
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
    targetIdp: parsed.targetIdp as IdpProvider,
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

export async function updateScenarioResultAction(formData: FormData) {
  const parsed = parseScenarioReviewForm(formData);
  const session = await requireFounder();
  await updateScenarioRunResult({
    scenarioRunId: parsed.scenarioRunId,
    outcome: parsed.outcome,
    reviewerNotes: parsed.reviewerNotes,
    actorName: session.name,
  });
  revalidatePath(`/app/engagements/${parsed.engagementId}`);
}

export async function addManualScenarioAction(formData: FormData) {
  const session = await requireFounder();
  const parsed = parseManualScenarioForm(formData);
  await addManualScenario({
    engagementId: parsed.engagementId,
    title: parsed.title,
    protocol: parsed.protocol,
    executionMode: parsed.executionMode,
    reviewerNotes: parsed.reviewerNotes,
    actorName: session.name,
  });
  revalidatePath(`/app/engagements/${parsed.engagementId}`);
}

export async function addMessageAction(formData: FormData) {
  const parsed = parseMessageForm(formData);
  const engagementId = parsed.engagementId;
  const session = await requireEngagementAccess(engagementId);
  const visibility = session.role === "founder" ? parsed.visibility : "shared";
  await addMessage({
    engagementId,
    authorName: session.name,
    body: parsed.body,
    visibility,
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function uploadAttachmentAction(formData: FormData) {
  const engagementId = parseJobActionForm(formData);
  const session = await requireEngagementAccess(engagementId);
  const file = formData.get("file");
  const requestedVisibility = parseVisibility(formData);
  const linkage = parseAttachmentLinkage(formData);
  const visibility = session.role === "founder" ? requestedVisibility : "shared";

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File is required.");
  }
  validateAttachmentUpload(file);

  const bytes = new Uint8Array(await file.arrayBuffer());
  validateAttachmentContent(bytes, file.type || "application/octet-stream", file.name);
  const safeFileName = sanitizeAttachmentFileName(file.name);
  const storageKey = `${engagementId}/${crypto.randomUUID()}-${safeFileName}`;
  await storeArtifact(storageKey, safeFileName, bytes, file.type || "application/octet-stream");
  await registerAttachment({
    engagementId,
    uploadedBy: session.name,
    visibility,
    fileName: safeFileName,
    storageKey,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    scenarioRunId: linkage.scenarioRunId,
    findingId: linkage.findingId,
    reportId: linkage.reportId,
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

export async function publishReportAction(formData: FormData) {
  const session = await requireFounder();
  const parsed = parsePublishReportForm(formData);
  const { reportId, engagementId } = parsed;
  await publishReport(reportId, session.name);
  const detail = await getEngagementDetail(engagementId);

  if (detail) {
    assertAppUrlConfigured();
    const portalUrl = `${env.appUrl}/app/engagements/${engagementId}`;
    const recipients = await listCustomerRecipientsForEngagement(engagementId);

    for (const recipient of recipients) {
      const notification = await queueNotification({
        engagementId,
        actorName: session.name,
        payload: {
          type: "report-published",
          to: recipient.email,
          recipientName: recipient.name,
          engagementTitle: detail.engagement.title,
          portalUrl,
        },
      });
      await dispatchNotificationJob({
        engagementId,
        actorName: session.name,
        notificationId: notification.id,
      });
      await audit(session.name, "report_notification_queued", "report", reportId, {
        engagementId,
        recipientEmail: recipient.email,
        notificationId: notification.id,
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
    const parsed = parseInviteForm(formData);
    const engagementId = parsed.engagementId;
    const created = await createInvite({
      email: parsed.email,
      name: parsed.name,
      role: "customer",
      engagementId,
      createdBy: session.name,
    });
    const detail = await getEngagementDetail(engagementId);
    let deliveryMessage = "Invite created. Share the invite link below if the recipient needs it immediately.";

    if (detail) {
      const notification = await queueNotification({
        engagementId,
        actorName: session.name,
        payload: {
          type: "invite",
          to: created.invite.email,
          inviteeName: created.invite.name,
          companyName: detail.engagement.companyName,
          engagementTitle: detail.engagement.title,
          inviteUrl: created.inviteUrl,
        },
      });
      await dispatchNotificationJob({
        engagementId,
        actorName: session.name,
        notificationId: notification.id,
      });
      await audit(session.name, "invite_delivery_queued", "invite", created.invite.id, {
        engagementId,
        notificationId: notification.id,
      });
      deliveryMessage = "Invite created. Email delivery is being processed in the background.";
    }

    revalidatePath(`/app/engagements/${engagementId}`);
    return {
      inviteUrl: created.inviteUrl,
      error: "",
      deliveryMessage,
    };
  } catch (error) {
    logError("invite.create_failed", error, {
      engagementId: formData.get("engagementId")?.toString() || "",
    });
    return {
      inviteUrl: "",
      error: validationMessage(error),
      deliveryMessage: "",
    };
  }
}

export async function createInviteAndRedirectAction(formData: FormData) {
  const engagementId = formData.get("engagementId")?.toString() || "";

  try {
    const result = await createInviteAction(undefined, formData);
    if (result.error) {
      await setEngagementFlashCookie({
        engagementId,
        error: result.error,
      });
      redirect(`/app/engagements/${engagementId}`);
    }

    await setEngagementFlashCookie({
      engagementId,
      inviteUrl: result.inviteUrl,
      notice: result.deliveryMessage,
    });
    redirect(`/app/engagements/${engagementId}`);
  } catch (error) {
    rethrowIfRedirectError(error);
    await setEngagementFlashCookie({
      engagementId,
      error: validationMessage(error),
    });
    redirect(`/app/engagements/${engagementId}`);
  }
}
