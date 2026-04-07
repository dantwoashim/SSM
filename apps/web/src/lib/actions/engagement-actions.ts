"use server";

import { createHash } from "node:crypto";
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
  enforceRateLimit,
  getEngagementDetail,
  hasEngagementAccess,
  listCustomerRecipientsForEngagement,
  publishReport,
  registerAttachment,
  softDeleteAttachment,
  updateScenarioRunResult,
} from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { assertSameOriginRequest, getRequestIp, getRequestMetadata } from "@/lib/request-context";
import { deleteArtifact, storeArtifact } from "@/lib/storage/provider";
import type { IdpProvider } from "@assurance/core";
import { dispatchJob } from "@/lib/jobs";
import { logError, logEvent } from "@/lib/logger";
import { queueNotification } from "@/lib/email";
import { dispatchNotificationJob } from "@/lib/jobs";
import {
  parseAttachmentLinkage,
  parseCreateEngagementForm,
  parseDeleteAttachmentForm,
  parseInviteForm,
  parseJobActionForm,
  parseManualScenarioForm,
  parseMessageForm,
  parsePublishReportForm,
  parseScenarioReviewForm,
  parseVisibility,
  inspectAttachmentContent,
  sanitizeAttachmentFileName,
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
    customerVisibleSummary: parsed.customerVisibleSummary,
    buyerSafeReportNote: parsed.buyerSafeReportNote,
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
    customerVisibleSummary: parsed.customerVisibleSummary,
    buyerSafeReportNote: parsed.buyerSafeReportNote,
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
  const ip = await getRequestIp();
  await enforceRateLimit({
    route: "attachment-upload",
    bucketKey: `attachment-upload:${session.sub}:${ip}`,
    limit: 30,
    windowMs: 15 * 60 * 1000,
  });
  const file = formData.get("file");
  const requestedVisibility = parseVisibility(formData);
  const linkage = parseAttachmentLinkage(formData);
  const visibility = session.role === "founder" ? requestedVisibility : "shared";

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File is required.");
  }
  validateAttachmentUpload(file);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspection = inspectAttachmentContent(bytes, file.type || "application/octet-stream", file.name);
  const safeFileName = sanitizeAttachmentFileName(file.name);
  const storageKey = `${engagementId}/${crypto.randomUUID()}-${safeFileName}`;
  logEvent("info", "attachment.upload_requested", {
    engagementId,
    actorId: session.sub,
    actorRole: session.role,
    originalFileName: file.name,
    normalizedFileName: safeFileName,
    contentType: file.type || "application/octet-stream",
    bytes: file.size,
    visibility,
    scenarioRunId: linkage.scenarioRunId,
    findingId: linkage.findingId,
    reportId: linkage.reportId,
    scanStatus: inspection.scanStatus,
    trustLevel: inspection.trustLevel,
  });
  await storeArtifact(storageKey, safeFileName, bytes, inspection.normalizedContentType);
  try {
    await registerAttachment({
      engagementId,
      uploadedBy: session.name,
      visibility,
      fileName: safeFileName,
      storageKey,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      contentType: inspection.normalizedContentType,
      size: file.size,
      scanStatus: inspection.scanStatus,
      scanSummary: inspection.scanSummary,
      trustLevel: inspection.trustLevel,
      retentionUntil: inspection.retentionUntil,
      scenarioRunId: linkage.scenarioRunId,
      findingId: linkage.findingId,
      reportId: linkage.reportId,
    });
  } catch (error) {
    await deleteArtifact(storageKey).catch(() => undefined);
    throw error;
  }
  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const session = await requireFounder();
  const parsed = parseDeleteAttachmentForm(formData);
  const detail = await getEngagementDetail(parsed.engagementId);

  if (!detail) {
    throw new Error("Engagement not found.");
  }

  const attachment = detail.attachmentRows.find((row: typeof detail.attachmentRows[number]) => row.id === parsed.attachmentId);
  if (!attachment) {
    throw new Error("Attachment not found.");
  }

  await softDeleteAttachment({
    attachmentId: parsed.attachmentId,
    actorName: session.name,
    reason: parsed.reason,
  });
  await deleteArtifact(attachment.storageKey).catch((error) => {
    logError("attachment.delete_storage_failed", error, {
      attachmentId: parsed.attachmentId,
      engagementId: parsed.engagementId,
    });
  });
  revalidatePath(`/app/engagements/${parsed.engagementId}`);
}

export async function uploadAttachmentStateAction(
  _previousState: { error: string; notice: string } | undefined,
  formData: FormData,
) {
  try {
    await uploadAttachmentAction(formData);
    return {
      error: "",
      notice: "Artifact uploaded successfully.",
    };
  } catch (error) {
    return {
      error: validationMessage(error),
      notice: "",
    };
  }
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
  const ip = await getRequestIp();
  await enforceRateLimit({
    route: "report-publish",
    bucketKey: `report-publish:${session.sub}:${ip}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  const requestMeta = await getRequestMetadata();
  const parsed = parsePublishReportForm(formData);
  const { reportId, engagementId } = parsed;
  await publishReport(reportId, session.name, parsed.acknowledgeWarnings);
  const detail = await getEngagementDetail(engagementId);

  if (detail) {
    assertAppUrlConfigured();
    const portalUrl = `${env.appUrl}/app/engagements/${engagementId}`;
    const recipients = await listCustomerRecipientsForEngagement(engagementId);

    for (const recipient of recipients) {
      const notification = await queueNotification({
        engagementId,
        actorName: session.name,
        idempotencyKey: `report:${reportId}:${recipient.email}`,
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
        actorId: session.sub,
        actorRole: session.role,
        engagementId,
        recipientEmail: recipient.email,
        notificationId: notification.id,
        requestId: requestMeta.requestId,
        requestIp: requestMeta.requestIp,
      });
    }
  }

  revalidatePath(`/app/engagements/${engagementId}`);
}

export async function publishReportStateAction(
  _previousState: { error: string; notice: string } | undefined,
  formData: FormData,
) {
  try {
    await publishReportAction(formData);
    return {
      error: "",
      notice: "Report published successfully.",
    };
  } catch (error) {
    return {
      error: validationMessage(error),
      notice: "",
    };
  }
}

export async function createInviteAction(
  _previousState: { inviteUrl: string; error: string; deliveryMessage: string } | undefined,
  formData: FormData,
) {
  try {
    const session = await requireFounder();
    const ip = await getRequestIp();
    await enforceRateLimit({
      route: "invite-create",
      bucketKey: `invite-create:${session.sub}:${ip}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    const requestMeta = await getRequestMetadata();
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
        idempotencyKey: `invite:${created.invite.id}`,
        payload: {
          type: "invite",
          to: created.invite.email,
          inviteeName: created.invite.name,
          companyName: detail.engagement.companyName,
          engagementTitle: detail.engagement.title,
          inviteUrl: created.inviteUrl,
        },
      });
      const dispatchResult = await dispatchNotificationJob({
        engagementId,
        actorName: session.name,
        notificationId: notification.id,
      });
      await audit(session.name, "invite_delivery_queued", "invite", created.invite.id, {
        actorId: session.sub,
        actorRole: session.role,
        engagementId,
        notificationId: notification.id,
        requestId: requestMeta.requestId,
        requestIp: requestMeta.requestIp,
      });
      deliveryMessage = "Invite created. Email delivery is being processed in the background.";
      if ("mode" in dispatchResult && dispatchResult.mode === "inline") {
        deliveryMessage = "Invite created. Notification handling completed during this request.";
      }
    }

    revalidatePath(`/app/engagements/${engagementId}`);
    return {
      inviteUrl: created.inviteUrl,
      error: "",
      deliveryMessage,
    };
  } catch (error) {
    const requestId = await getRequestIdSafe();
    logError("invite.create_failed", error, {
      engagementId: formData.get("engagementId")?.toString() || "",
      requestId,
    });
    return {
      inviteUrl: "",
      error: validationMessage(error),
      deliveryMessage: "",
    };
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
