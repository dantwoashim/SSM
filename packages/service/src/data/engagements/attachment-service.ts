import { eq, sql } from "drizzle-orm";
import { runInTransaction } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
import { attachments, findings, reports, scenarioRuns, testRuns } from "../schema";
import { AttachmentLinkageError } from "../../errors";

export async function registerAttachment(input: {
  engagementId: string;
  uploadedBy: string;
  visibility: "shared" | "internal";
  fileName: string;
  storageKey: string;
  checksumSha256?: string | null;
  contentType: string;
  size: number;
  scanStatus: "clean" | "manual-review-required";
  scanSummary: string;
  trustLevel: "verified" | "restricted";
  retentionUntil: string;
  scenarioRunId?: string | null;
  findingId?: string | null;
  reportId?: string | null;
}) {
  return runInTransaction(async (db) => {
    if (input.scenarioRunId) {
      const [scenarioRun] = await db
        .select({
          id: scenarioRuns.id,
          testRunId: scenarioRuns.testRunId,
          engagementId: testRuns.engagementId,
          evidence: scenarioRuns.evidence,
        })
        .from(scenarioRuns)
        .innerJoin(testRuns, eq(testRuns.id, scenarioRuns.testRunId))
        .where(eq(scenarioRuns.id, input.scenarioRunId))
        .limit(1);

      if (!scenarioRun || scenarioRun.engagementId !== input.engagementId) {
        throw new AttachmentLinkageError("Linked scenario does not belong to this engagement.");
      }
    }

    if (input.findingId) {
      const [finding] = await db
        .select()
        .from(findings)
        .where(eq(findings.id, input.findingId))
        .limit(1);

      if (!finding || finding.engagementId !== input.engagementId) {
        throw new AttachmentLinkageError("Linked finding does not belong to this engagement.");
      }

      if (input.scenarioRunId && finding.scenarioRunId && finding.scenarioRunId !== input.scenarioRunId) {
        throw new AttachmentLinkageError("Linked finding does not match the selected scenario.");
      }
    }

    if (input.reportId) {
      const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.id, input.reportId))
        .limit(1);

      if (!report || report.engagementId !== input.engagementId) {
        throw new AttachmentLinkageError("Linked report does not belong to this engagement.");
      }
    }

    const attachment = {
      id: makeId("attachment"),
      engagementId: input.engagementId,
      scenarioRunId: input.scenarioRunId || null,
      findingId: input.findingId || null,
      reportId: input.reportId || null,
      uploadedBy: input.uploadedBy,
      visibility: input.visibility,
      fileName: input.fileName,
      storageKey: input.storageKey,
      checksumSha256: input.checksumSha256 || null,
      storageStatus: "stored",
      scanStatus: input.scanStatus,
      scanSummary: input.scanSummary,
      trustLevel: input.trustLevel,
      contentType: input.contentType,
      size: input.size,
      createdAt: now(),
      retentionUntil: input.retentionUntil,
      deletedAt: null,
      deletedReason: null,
    };
    await db.insert(attachments).values(attachment);

    if (attachment.scenarioRunId) {
      const attachmentEvidenceJson = JSON.stringify([attachment.id]);
      await db
        .update(scenarioRuns)
        .set({
          evidence: sql`CASE
            WHEN COALESCE(${scenarioRuns.evidence}, '[]'::jsonb) @> ${attachmentEvidenceJson}::jsonb
              THEN COALESCE(${scenarioRuns.evidence}, '[]'::jsonb)
            ELSE COALESCE(${scenarioRuns.evidence}, '[]'::jsonb) || ${attachmentEvidenceJson}::jsonb
          END`,
          updatedAt: now(),
        })
        .where(eq(scenarioRuns.id, attachment.scenarioRunId));
    }
    await audit(input.uploadedBy, "uploaded_attachment", "attachment", attachment.id, {
      engagementId: input.engagementId,
      fileName: input.fileName,
      visibility: input.visibility,
      scanStatus: input.scanStatus,
      trustLevel: input.trustLevel,
      scenarioRunId: input.scenarioRunId || null,
      findingId: input.findingId || null,
      reportId: input.reportId || null,
    }, db);
    return attachment;
  });
}

export async function softDeleteAttachment(input: {
  attachmentId: string;
  actorName: string;
  reason: string;
}) {
  return runInTransaction(async (db) => {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, input.attachmentId))
      .limit(1);

    if (!attachment) {
      throw new Error("Attachment not found.");
    }

    if (attachment.deletedAt) {
      return attachment;
    }

    const timestamp = now();
    await db
      .update(attachments)
      .set({
        storageStatus: "deleted",
        deletedAt: timestamp,
        deletedReason: input.reason,
      })
      .where(eq(attachments.id, input.attachmentId));

    if (attachment.scenarioRunId) {
      const [scenarioRun] = await db
        .select()
        .from(scenarioRuns)
        .where(eq(scenarioRuns.id, attachment.scenarioRunId))
        .limit(1);

      if (scenarioRun) {
        const nextEvidence = (scenarioRun.evidence || []).filter((id: string) => id !== attachment.id);
        await db
          .update(scenarioRuns)
          .set({
            evidence: nextEvidence,
            updatedAt: timestamp,
          })
          .where(eq(scenarioRuns.id, attachment.scenarioRunId));
      }
    }

    await audit(input.actorName, "deleted_attachment", "attachment", attachment.id, {
      engagementId: attachment.engagementId,
      reason: input.reason,
    }, db);

    return {
      ...attachment,
      storageStatus: "deleted" as const,
      deletedAt: timestamp,
      deletedReason: input.reason,
    };
  });
}
