import {
  computeReadinessScore,
  formatExecutiveSummary,
  type ReportSnapshot,
  scenarioLibrary,
} from "@assurance/core";
import { eq } from "drizzle-orm";
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

function buildReportSnapshot(input: {
  engagement: typeof engagements.$inferSelect;
  scenarioRows: Array<typeof scenarioRunsTable.$inferSelect>;
  findingRows: Array<typeof findingsTable.$inferSelect>;
  attachmentRows: Array<typeof attachments.$inferSelect>;
}): ReportSnapshot {
  const scenarios = input.scenarioRows.map((row) => {
    const definition = scenarioLibrary.find((scenario) => scenario.id === row.scenarioId);
    const linkedAttachmentCount = input.attachmentRows.filter(
      (attachment) => attachment.scenarioRunId === row.id,
    ).length;
    return {
      id: row.scenarioId,
      title: row.title || definition?.title || row.scenarioId,
      protocol: (definition?.protocol || row.protocol) as "saml" | "oidc" | "scim" | "ops",
      outcome: row.outcome as "pending" | "passed" | "failed" | "skipped",
      reviewerNotes: row.reviewerNotes || "",
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
      summary: row.summary,
      remediation: row.remediation,
      buyerSafeNote: row.buyerSafeNote,
      evidenceCount: input.attachmentRows.filter((attachment) => attachment.findingId === row.id).length,
    }));

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
      readinessScore: 0,
    },
    scenarios,
    findings: findingsView,
  };

  snapshot.summary.executiveSummary = formatExecutiveSummary(snapshot);
  snapshot.summary.readinessScore = computeReadinessScore(snapshot);
  return snapshot;
}

export async function generateReport(engagementId: string, actorName: string) {
  const db = await getDb();
  const detail = await getEngagementDetail(engagementId);

  if (!detail) {
    throw new Error("Engagement not found.");
  }

  const snapshot = buildReportSnapshot({
    engagement: detail.engagement,
    scenarioRows: detail.scenarioRows,
    findingRows: detail.findingRows,
    attachmentRows: detail.attachmentRows,
  });
  const version = (detail.reportRows[0]?.version || 0) + 1;
  const report = {
    id: makeId("report"),
    engagementId,
    version,
    status: "draft",
    executiveSummary: snapshot.summary.executiveSummary,
    residualRisk: snapshot.summary.residualRisk,
    scopeBoundaries: snapshot.summary.scopeBoundaries,
    readinessScore: snapshot.summary.readinessScore,
    reportJson: snapshot,
    createdAt: now(),
    publishedAt: null,
  };

  await db.insert(reports).values(report);
  await db
    .update(engagements)
    .set({
      status: "report-drafting",
      updatedAt: now(),
    })
    .where(eq(engagements.id, engagementId));
  await audit(actorName, "generated_report", "report", report.id, {
    engagementId,
    version,
  });
  return report;
}

export async function publishReport(reportId: string, actorName: string) {
  await runInTransaction(async (db) => {
    const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report) {
      throw new Error("Report not found.");
    }

    const timestamp = now();
    await db
      .update(reports)
      .set({
        status: "published",
        publishedAt: timestamp,
      })
      .where(eq(reports.id, reportId));
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
