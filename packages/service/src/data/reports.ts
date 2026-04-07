import {
  buildPublicationAssessment,
  computeReadinessScore,
  formatExecutiveSummary,
  type ReportSnapshot,
  scenarioLibrary,
} from "@assurance/core";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb, runInTransaction } from "./client";
import { audit } from "./audit";
import { getEngagementDetail } from "./engagements";
import { makeId, now } from "./helpers";
import {
  attachments,
  engagements,
  findings as findingsTable,
  reports,
  scenarioRuns as scenarioRunsTable,
} from "./schema";
import { assertEngagementTransition, assertReportTransition } from "./workflow";
import { buildProviderValidationSummary } from "../provider-adapters";

function slugifyScenarioTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildCurrentFindingKey(row: Pick<typeof scenarioRunsTable.$inferSelect, "scenarioId" | "protocol" | "title">) {
  if (row.scenarioId.startsWith("manual:")) {
    return row.scenarioId;
  }

  return `${row.protocol}:${row.scenarioId}:${slugifyScenarioTitle(row.title || row.scenarioId)}`;
}

function buildEvidenceHash(rows: Array<typeof attachments.$inferSelect>) {
  const fingerprint = rows
    .filter((row) => !row.deletedAt)
    .map((row) =>
      [
        row.id,
        row.storageKey,
        row.checksumSha256 || "",
        row.scanStatus,
        row.trustLevel,
        row.createdAt,
      ].join(":"),
    )
    .sort()
    .join("|");

  return createHash("sha256").update(fingerprint).digest("hex");
}

function buildReportSnapshot(input: {
  engagement: typeof engagements.$inferSelect;
  scenarioRows: Array<typeof scenarioRunsTable.$inferSelect>;
  findingRows: Array<typeof findingsTable.$inferSelect>;
  attachmentRows: Array<typeof attachments.$inferSelect>;
}): ReportSnapshot {
  const providerValidation = buildProviderValidationSummary(input.engagement);
  const scenarios = input.scenarioRows.map((row) => {
    const definition = scenarioLibrary.find((scenario) => scenario.id === row.scenarioId);
    const linkedAttachmentCount = input.attachmentRows.filter(
      (attachment) => attachment.scenarioRunId === row.id,
    ).length;
    return {
      id: row.scenarioId,
      title: row.title || definition?.title || row.scenarioId,
      protocol: (definition?.protocol || row.protocol) as "saml" | "scim" | "ops",
      executionMode: row.executionMode as "manual" | "guided",
      outcome: row.outcome as "pending" | "passed" | "failed" | "skipped",
      customerSummary: row.customerVisibleSummary || row.reviewerNotes || "No customer-facing summary recorded.",
      buyerSafeReportNote: row.buyerSafeReportNote || row.customerVisibleSummary || "No buyer-safe report note recorded.",
      evidenceCount: linkedAttachmentCount || row.evidence.length,
    };
  });

  const currentScenarioKeys = new Set(input.scenarioRows.map((row) => buildCurrentFindingKey(row)));
  const findingsView = input.findingRows
    .filter((finding) => finding.status === "open")
    .filter((finding) => !finding.findingKey || currentScenarioKeys.has(finding.findingKey))
    .map((row) => ({
      title: row.title,
      severity: row.severity,
      customerSummary: row.reportSummary || row.customerSummary || row.buyerSafeNote,
      remediation: row.remediation,
      buyerSafeNote: row.buyerSafeNote,
      evidenceCount: input.attachmentRows.filter((attachment) => attachment.findingId === row.id).length,
    }));

  const passedScenarios = scenarios.filter((scenario) => scenario.outcome === "passed").length;
  const failedScenarios = scenarios.filter((scenario) => scenario.outcome === "failed").length;
  const skippedScenarios = scenarios.filter((scenario) => scenario.outcome === "skipped").length;
  const pendingScenarios = scenarios.filter((scenario) => scenario.outcome === "pending").length;
  const executedScenarios = passedScenarios + failedScenarios;
  const manualScenarios = scenarios.filter((scenario) => scenario.executionMode === "manual").length;
  const guidedScenarios = scenarios.filter((scenario) => scenario.executionMode === "guided").length;

  const snapshot: ReportSnapshot = {
    engagementTitle: input.engagement.title,
    companyName: input.engagement.companyName,
    targetCustomer: input.engagement.targetCustomer,
    provider: input.engagement.targetIdp,
    generatedAt: now(),
    summary: {
      executiveSummary: "",
      residualRisk:
        findingsView.length === 0
          ? "No open findings remain in the tested scope."
          : `${findingsView.length} finding(s) remain open in the current scope.`,
      scopeBoundaries:
        "Validation covers the scoped environment, declared scenarios, and evidence captured during the current review cycle.",
      assuranceMethod:
        "This report is based on reviewer-managed scenario execution and collected evidence. The application preserves scope, auditability, and publication gates, but tenant-specific verification remains operator-run.",
      providerValidation,
      readinessScore: 0,
      totalScenarios: scenarios.length,
      executedScenarios,
      passedScenarios,
      failedScenarios,
      skippedScenarios,
      pendingScenarios,
      manualScenarios,
      guidedScenarios,
      publication: {
        canPublish: false,
        requiresAcknowledgement: false,
        blockingReasons: [],
        warnings: [],
      },
    },
    scenarios,
    findings: findingsView,
  };

  snapshot.summary.publication = buildPublicationAssessment(snapshot);
  if (providerValidation.adapterStatus === "unsupported") {
    snapshot.summary.publication.blockingReasons.push(
      "Requested provider features exceed the current scenario coverage for this provider.",
    );
    snapshot.summary.publication.canPublish = false;
  }
  snapshot.summary.executiveSummary = formatExecutiveSummary(snapshot);
  snapshot.summary.readinessScore = computeReadinessScore(snapshot);
  return snapshot;
}

export function validateReportPublication(snapshot: ReportSnapshot, acknowledgedWarnings = false) {
  if (!snapshot.summary.publication.canPublish) {
    throw new Error(snapshot.summary.publication.blockingReasons[0] || "This report cannot be published yet.");
  }

  if (snapshot.summary.publication.requiresAcknowledgement && !acknowledgedWarnings) {
    throw new Error("Publishing this report requires explicit acknowledgement of skipped scenarios or open findings.");
  }
}

export async function generateReport(engagementId: string, actorName: string) {
  const detail = await getEngagementDetail(engagementId);

  if (!detail) {
    throw new Error("Engagement not found.");
  }

  return runInTransaction(async (db) => {
    const basisRunId = detail.latestRun?.id || null;
    if (basisRunId) {
      const [existingDraft] = await db
        .select()
        .from(reports)
        .where(and(eq(reports.engagementId, engagementId), eq(reports.basisRunId, basisRunId), eq(reports.status, "draft")))
        .limit(1);

      if (existingDraft) {
        return existingDraft;
      }
    }

    const snapshot = buildReportSnapshot({
      engagement: detail.engagement,
      scenarioRows: detail.scenarioRows,
      findingRows: detail.findingRows,
      attachmentRows: detail.attachmentRows,
    });
    const version = (detail.reportRows[0]?.version || 0) + 1;
    const timestamp = now();
    const report = {
      id: makeId("report"),
      engagementId,
      version,
      basisRunId,
      basisEvidenceHash: buildEvidenceHash(detail.attachmentRows),
      status: "draft" as const,
      executiveSummary: snapshot.summary.executiveSummary,
      residualRisk: snapshot.summary.residualRisk,
      scopeBoundaries: snapshot.summary.scopeBoundaries,
      readinessScore: snapshot.summary.readinessScore,
      reportJson: snapshot,
      createdAt: timestamp,
      publishedAt: null,
    };

    try {
      await db.insert(reports).values(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (basisRunId && /reports_engagement_basis_draft_idx|duplicate|unique/i.test(message)) {
        const [existingDraft] = await db
          .select()
          .from(reports)
          .where(and(eq(reports.engagementId, engagementId), eq(reports.basisRunId, basisRunId), eq(reports.status, "draft")))
          .limit(1);

        if (existingDraft) {
          return existingDraft;
        }
      }

      throw error;
    }

    assertEngagementTransition(detail.engagement.status, "report-drafting");
    await db
      .update(engagements)
      .set({
        status: "report-drafting",
        updatedAt: timestamp,
      })
      .where(eq(engagements.id, engagementId));
    await audit(actorName, "generated_report", "report", report.id, {
      engagementId,
      version,
      basisRunId,
      basisEvidenceHash: report.basisEvidenceHash,
    }, db);
    return report;
  });
}

export async function publishReport(reportId: string, actorName: string, acknowledgedWarnings = false) {
  await runInTransaction(async (db) => {
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report) {
      throw new Error("Report not found.");
    }

    validateReportPublication(report.reportJson, acknowledgedWarnings);
    assertReportTransition(report.status, "published");

    const timestamp = now();
    await db
      .update(reports)
      .set({
        status: "published",
        publishedAt: timestamp,
      })
      .where(eq(reports.id, reportId));
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, report.engagementId))
      .limit(1);

    if (!engagement) {
      throw new Error("Engagement not found.");
    }

    assertEngagementTransition(engagement.status, "report-ready");
    await db
      .update(engagements)
      .set({
        status: "report-ready",
        updatedAt: timestamp,
      })
      .where(eq(engagements.id, report.engagementId));
    await audit(actorName, "published_report", "report", reportId, {
      engagementId: report.engagementId,
    }, db);
  });
}

export async function findReportById(reportId: string) {
  const db = await getDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  return report ?? null;
}

export async function findAttachmentById(id: string) {
  const db = await getDb();
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);
  return attachment ?? null;
}
