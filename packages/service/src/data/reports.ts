import {
  buildPublicationAssessment,
  computeReadinessScore,
  formatExecutiveSummary,
  type ReportSnapshot,
  scenarioLibrary,
} from "@assurance/core";
import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb, runInTransaction } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import {
  attachments,
  engagements,
  findings as findingsTable,
  reports,
  scenarioRuns as scenarioRunsTable,
  testRuns,
} from "./schema";
import { assertEngagementTransition, assertReportTransition } from "./workflow";
import { buildProviderValidationSummary } from "../provider-adapters";
import { ReportStaleError } from "../errors";

type ReportBasisDetail = {
  engagement: typeof engagements.$inferSelect;
  latestRun: typeof testRuns.$inferSelect | null;
  scenarioRows: Array<typeof scenarioRunsTable.$inferSelect>;
  findingRows: Array<typeof findingsTable.$inferSelect>;
  attachmentRows: Array<typeof attachments.$inferSelect>;
  reportRows: Array<typeof reports.$inferSelect>;
};

export type ReportPublicationArtifact = {
  storageKey: string;
  fileName: string;
  contentType: string;
  checksumSha256?: string | null;
};

export type ReportFreshnessAssessment = {
  isFresh: boolean;
  reasons: string[];
  currentBasisRunId: string | null;
  currentEvidenceHash: string;
  currentStateHash: string;
};

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
      buyerSafeReportNote:
        row.buyerSafeReportNote || row.customerVisibleSummary || "No buyer-safe report note recorded.",
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

function buildStateHash(snapshot: ReportSnapshot) {
  const normalizedSnapshot = {
    ...snapshot,
    generatedAt: "",
  };

  return createHash("sha256").update(JSON.stringify(normalizedSnapshot)).digest("hex");
}

function buildReportBasis(detail: Omit<ReportBasisDetail, "reportRows"> | ReportBasisDetail) {
  const snapshot = buildReportSnapshot({
    engagement: detail.engagement,
    scenarioRows: detail.scenarioRows,
    findingRows: detail.findingRows,
    attachmentRows: detail.attachmentRows,
  });

  return {
    snapshot,
    basisRunId: detail.latestRun?.id || null,
    basisEvidenceHash: buildEvidenceHash(detail.attachmentRows),
    basisStateHash: buildStateHash(snapshot),
  };
}

async function loadReportBasisDetail(db: Awaited<ReturnType<typeof getDb>>, engagementId: string): Promise<ReportBasisDetail | null> {
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId))
    .limit(1);

  if (!engagement) {
    return null;
  }

  const runRows = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.engagementId, engagementId))
    .orderBy(desc(testRuns.createdAt));
  const latestRun = runRows[0] ?? null;
  const scenarioRows = latestRun
    ? await db.select().from(scenarioRunsTable).where(eq(scenarioRunsTable.testRunId, latestRun.id))
    : [];
  const findingRows = await db
    .select()
    .from(findingsTable)
    .where(eq(findingsTable.engagementId, engagementId))
    .orderBy(desc(findingsTable.createdAt));
  const reportRows = await db
    .select()
    .from(reports)
    .where(eq(reports.engagementId, engagementId))
    .orderBy(desc(reports.version));
  const attachmentRows = (await db
    .select()
    .from(attachments)
    .where(eq(attachments.engagementId, engagementId))
    .orderBy(desc(attachments.createdAt)))
    .filter((attachment: typeof attachments.$inferSelect) => !attachment.deletedAt);

  return {
    engagement,
    latestRun,
    scenarioRows,
    findingRows,
    attachmentRows,
    reportRows,
  };
}

function compareReportBasis(
  report: Pick<typeof reports.$inferSelect, "basisRunId" | "basisEvidenceHash" | "basisStateHash">,
  basis: Pick<ReturnType<typeof buildReportBasis>, "basisRunId" | "basisEvidenceHash" | "basisStateHash">,
): ReportFreshnessAssessment {
  const reasons: string[] = [];

  if ((report.basisRunId || null) !== basis.basisRunId) {
    reasons.push("The current test cycle changed after this draft was generated.");
  }

  if ((report.basisEvidenceHash || null) !== (basis.basisEvidenceHash || null)) {
    reasons.push("Evidence changed after this draft was generated.");
  }

  if ((report.basisStateHash || null) !== (basis.basisStateHash || null)) {
    reasons.push("Scenario outcomes or finding state changed after this draft was generated.");
  }

  return {
    isFresh: reasons.length === 0,
    reasons,
    currentBasisRunId: basis.basisRunId,
    currentEvidenceHash: basis.basisEvidenceHash,
    currentStateHash: basis.basisStateHash,
  };
}

export function assessReportFreshness(
  report: Pick<typeof reports.$inferSelect, "basisRunId" | "basisEvidenceHash" | "basisStateHash">,
  detail: Omit<ReportBasisDetail, "reportRows"> | ReportBasisDetail,
) {
  return compareReportBasis(report, buildReportBasis(detail));
}

export function validateReportPublication(
  snapshot: ReportSnapshot,
  acknowledgedWarnings = false,
  freshness?: Pick<ReportFreshnessAssessment, "isFresh" | "reasons">,
) {
  if (freshness && !freshness.isFresh) {
    throw new ReportStaleError(freshness.reasons);
  }

  if (!snapshot.summary.publication.canPublish) {
    throw new Error(snapshot.summary.publication.blockingReasons[0] || "This report cannot be published yet.");
  }

  if (snapshot.summary.publication.requiresAcknowledgement && !acknowledgedWarnings) {
    throw new Error("Publishing this report requires explicit acknowledgement of skipped scenarios or open findings.");
  }
}

export async function generateReport(engagementId: string, actorName: string) {
  return runInTransaction(async (db) => {
    const detail = await loadReportBasisDetail(db, engagementId);

    if (!detail) {
      throw new Error("Engagement not found.");
    }

    const { snapshot, basisRunId, basisEvidenceHash, basisStateHash } = buildReportBasis(detail);
    const timestamp = now();

    if (basisRunId) {
      const [existingDraft] = await db
        .select()
        .from(reports)
        .where(
          and(
            eq(reports.engagementId, engagementId),
            eq(reports.basisRunId, basisRunId),
            eq(reports.status, "draft"),
          ),
        )
        .limit(1);

      if (existingDraft) {
        const freshness = compareReportBasis(existingDraft, {
          basisRunId,
          basisEvidenceHash,
          basisStateHash,
        });

        if (freshness.isFresh) {
          return existingDraft;
        }

        const refreshedDraft = {
          ...existingDraft,
          basisEvidenceHash,
          basisStateHash,
          executiveSummary: snapshot.summary.executiveSummary,
          residualRisk: snapshot.summary.residualRisk,
          scopeBoundaries: snapshot.summary.scopeBoundaries,
          readinessScore: snapshot.summary.readinessScore,
          reportJson: snapshot,
        };

        await db
          .update(reports)
          .set({
            basisEvidenceHash,
            basisStateHash,
            executiveSummary: snapshot.summary.executiveSummary,
            residualRisk: snapshot.summary.residualRisk,
            scopeBoundaries: snapshot.summary.scopeBoundaries,
            readinessScore: snapshot.summary.readinessScore,
            reportJson: snapshot,
          })
          .where(eq(reports.id, existingDraft.id));
        await audit(actorName, "refreshed_report_draft", "report", existingDraft.id, {
          engagementId,
          version: existingDraft.version,
          basisRunId,
          basisEvidenceHash,
          basisStateHash,
        }, db);
        return refreshedDraft;
      }
    }

    const version = (detail.reportRows[0]?.version || 0) + 1;
    const report = {
      id: makeId("report"),
      engagementId,
      version,
      basisRunId,
      basisEvidenceHash,
      basisStateHash,
      status: "draft" as const,
      executiveSummary: snapshot.summary.executiveSummary,
      residualRisk: snapshot.summary.residualRisk,
      scopeBoundaries: snapshot.summary.scopeBoundaries,
      readinessScore: snapshot.summary.readinessScore,
      publishedArtifactStorageKey: null,
      publishedArtifactFileName: null,
      publishedArtifactContentType: null,
      publishedArtifactChecksumSha256: null,
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
          .where(
            and(
              eq(reports.engagementId, engagementId),
              eq(reports.basisRunId, basisRunId),
              eq(reports.status, "draft"),
            ),
          )
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
      basisEvidenceHash,
      basisStateHash,
    }, db);
    return report;
  });
}

export async function publishReport(
  reportId: string,
  actorName: string,
  acknowledgedWarnings = false,
  publicationArtifact?: ReportPublicationArtifact,
) {
  await runInTransaction(async (db) => {
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report) {
      throw new Error("Report not found.");
    }

    const detail = await loadReportBasisDetail(db, report.engagementId);

    if (!detail) {
      throw new Error("Engagement not found.");
    }

    const freshness = compareReportBasis(report, buildReportBasis(detail));
    validateReportPublication(report.reportJson, acknowledgedWarnings, freshness);
    assertReportTransition(report.status, "published");

    const timestamp = now();
    await db
      .update(reports)
      .set({
        status: "published",
        publishedAt: timestamp,
        publishedArtifactStorageKey: publicationArtifact?.storageKey || report.publishedArtifactStorageKey,
        publishedArtifactFileName: publicationArtifact?.fileName || report.publishedArtifactFileName,
        publishedArtifactContentType: publicationArtifact?.contentType || report.publishedArtifactContentType,
        publishedArtifactChecksumSha256:
          publicationArtifact?.checksumSha256 || report.publishedArtifactChecksumSha256,
      })
      .where(eq(reports.id, reportId));

    assertEngagementTransition(detail.engagement.status, "report-ready");
    await db
      .update(engagements)
      .set({
        status: "report-ready",
        updatedAt: timestamp,
      })
      .where(eq(engagements.id, report.engagementId));
    await audit(actorName, "published_report", "report", reportId, {
      engagementId: report.engagementId,
      basisRunId: report.basisRunId,
      basisEvidenceHash: report.basisEvidenceHash,
      basisStateHash: report.basisStateHash,
      immutableArtifactStored: !!publicationArtifact,
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
