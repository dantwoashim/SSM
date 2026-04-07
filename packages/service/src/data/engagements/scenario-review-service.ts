import { and, eq } from "drizzle-orm";
import { runInTransaction } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
import { engagements, findings, scenarioRuns, testRuns } from "../schema";
import { assertTestRunTransition } from "../workflow";
import { buildFindingKey, buildScenarioFindingTemplate } from "./shared";

export async function updateScenarioRunResult(input: {
  scenarioRunId: string;
  outcome: "pending" | "passed" | "failed" | "skipped";
  reviewerNotes: string;
  customerVisibleSummary: string;
  buyerSafeReportNote: string;
  actorName: string;
}) {
  return runInTransaction(async (db) => {
    const [scenarioRun] = await db
      .select()
      .from(scenarioRuns)
      .where(eq(scenarioRuns.id, input.scenarioRunId))
      .limit(1);

    if (!scenarioRun) {
      throw new Error("Scenario run not found.");
    }

    const [testRun] = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.id, scenarioRun.testRunId))
      .limit(1);

    if (!testRun) {
      throw new Error("Test run not found.");
    }

    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, testRun.engagementId))
      .limit(1);

    if (!engagement) {
      throw new Error("Engagement not found.");
    }

    const timestamp = now();
    await db
      .update(scenarioRuns)
      .set({
        outcome: input.outcome,
        status: input.outcome === "pending" ? "queued" : "reviewed",
        reviewerNotes: input.reviewerNotes,
        customerVisibleSummary: input.customerVisibleSummary,
        buyerSafeReportNote: input.buyerSafeReportNote,
        updatedAt: timestamp,
      })
      .where(eq(scenarioRuns.id, input.scenarioRunId));

    const findingKey = buildFindingKey({
      scenarioId: scenarioRun.scenarioId,
      protocol: scenarioRun.protocol,
      title: scenarioRun.title,
    });
    const template = buildScenarioFindingTemplate({
      scenarioId: scenarioRun.scenarioId,
      title: scenarioRun.title,
      protocol: scenarioRun.protocol,
      reviewerNotes: input.reviewerNotes,
      customerVisibleSummary: input.customerVisibleSummary,
      buyerSafeReportNote: input.buyerSafeReportNote,
    });
    const [existingFinding] = await db
      .select()
      .from(findings)
      .where(and(eq(findings.engagementId, engagement.id), eq(findings.findingKey, findingKey)))
      .limit(1);

    if (input.outcome === "failed") {
      if (existingFinding) {
        await db
          .update(findings)
          .set({
            testRunId: testRun.id,
            scenarioRunId: scenarioRun.id,
            severity: template.severity,
            customerImpact: template.customerImpact,
            summary: input.reviewerNotes || template.customerImpact,
            customerSummary: input.customerVisibleSummary || template.customerImpact,
            reportSummary: input.buyerSafeReportNote || template.buyerSafeNote,
            remediation: template.remediation,
            buyerSafeNote: template.buyerSafeNote,
            status: "open",
            lastObservedInRunId: testRun.id,
            resolvedAt: null,
            updatedAt: timestamp,
          })
          .where(eq(findings.id, existingFinding.id));
      } else {
        await db.insert(findings).values({
          id: makeId("finding"),
          engagementId: engagement.id,
          testRunId: testRun.id,
          scenarioRunId: scenarioRun.id,
          findingKey,
          openedInRunId: testRun.id,
          lastObservedInRunId: testRun.id,
          title: template.title,
          severity: template.severity,
          customerImpact: template.customerImpact,
          summary: input.reviewerNotes || template.customerImpact,
          customerSummary: input.customerVisibleSummary || template.customerImpact,
          reportSummary: input.buyerSafeReportNote || template.buyerSafeNote,
          rootCause: null,
          remediation: template.remediation,
          ownerHint: "Engineering owner",
          buyerSafeNote: template.buyerSafeNote,
          status: "open",
          resolvedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    if (input.outcome === "passed" && existingFinding) {
      await db
        .update(findings)
        .set({
          testRunId: testRun.id,
          scenarioRunId: scenarioRun.id,
          status: "resolved",
          lastObservedInRunId: testRun.id,
          resolvedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(findings.id, existingFinding.id));
    }

    if (input.outcome === "pending" && existingFinding) {
      await db
        .update(findings)
        .set({
          testRunId: testRun.id,
          scenarioRunId: scenarioRun.id,
          status: "pending-review",
          updatedAt: timestamp,
        })
        .where(eq(findings.id, existingFinding.id));
    }

    const updatedScenarioRuns: Array<typeof scenarioRuns.$inferSelect> = await db
      .select()
      .from(scenarioRuns)
      .where(eq(scenarioRuns.testRunId, testRun.id));
    const outstandingCount = updatedScenarioRuns.filter((row) => row.outcome === "pending").length;
    const nextTestRunStatus = outstandingCount > 0 ? "running" : "completed";
    assertTestRunTransition(testRun.status, nextTestRunStatus);
    await db
      .update(testRuns)
      .set({
        status: nextTestRunStatus,
        completedAt: outstandingCount > 0 ? null : timestamp,
      })
      .where(eq(testRuns.id, testRun.id));

    await audit(input.actorName, "updated_scenario_run", "scenario_run", scenarioRun.id, {
      outcome: input.outcome,
      engagementId: engagement.id,
      findingKey,
    }, db);
  });
}
