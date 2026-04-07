"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  audit,
  enforceRateLimit,
  findReportById,
  getEngagementDetail,
  listCustomerRecipientsForEngagement,
  publishReport,
} from "@/lib/data";
import { assertAppUrlConfigured, env } from "@/lib/env";
import { queueNotification } from "@/lib/email";
import { dispatchNotificationJob } from "@/lib/jobs";
import { logError } from "@/lib/logger";
import { renderReportPdf } from "@/lib/pdf";
import { getRequestIp, getRequestMetadata } from "@/lib/request-context";
import { deleteArtifact, storeArtifact } from "@/lib/storage/provider";
import {
  parsePublishReportForm,
  sanitizeAttachmentFileName,
  validationMessage,
} from "@/lib/validation";
import { requireFounder } from "./shared";

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
  const report = await findReportById(reportId);

  if (!report) {
    throw new Error("Report not found.");
  }

  const publishedFileName = sanitizeAttachmentFileName(
    `${engagementId}-report-v${report.version}.pdf`,
  );
  const storageKey = `published-reports/${engagementId}/${report.id}/v${report.version}.pdf`;
  const pdfBytes = await renderReportPdf(report.reportJson);
  const publishedChecksumSha256 = createHash("sha256").update(pdfBytes).digest("hex");
  await storeArtifact(storageKey, publishedFileName, pdfBytes, "application/pdf");

  try {
    await publishReport(reportId, session.name, parsed.acknowledgeWarnings, {
      storageKey,
      fileName: publishedFileName,
      contentType: "application/pdf",
      checksumSha256: publishedChecksumSha256,
    });
  } catch (error) {
    await deleteArtifact(storageKey).catch((cleanupError) => {
      logError("report.publish_cleanup_failed", cleanupError, {
        reportId,
        engagementId,
        storageKey,
        requestId: requestMeta.requestId,
        requestIp: requestMeta.requestIp,
      });
    });
    throw error;
  }

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
        publishedArtifactStorageKey: storageKey,
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
