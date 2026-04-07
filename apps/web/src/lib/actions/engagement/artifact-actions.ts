"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  enforceRateLimit,
  getEngagementDetail,
  registerAttachment,
  softDeleteAttachment,
} from "@/lib/data";
import { deleteArtifact, storeArtifact } from "@/lib/storage/provider";
import { getRequestIp } from "@/lib/request-context";
import { logError, logEvent } from "@/lib/logger";
import {
  inspectAttachmentContent,
  parseAttachmentLinkage,
  parseDeleteAttachmentForm,
  parseJobActionForm,
  parseVisibility,
  sanitizeAttachmentFileName,
  validateAttachmentUpload,
  validationMessage,
} from "@/lib/validation";
import { requireEngagementAccess, requireFounder } from "./shared";

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
