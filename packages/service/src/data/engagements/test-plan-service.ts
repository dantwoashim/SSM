import { scenarioLibrary, selectScenarios } from "@assurance/core";
import { and, desc, eq } from "drizzle-orm";
import { getDb, runInTransaction } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
import { engagements, scenarioRuns, testRuns } from "../schema";
import { assertEngagementTransition, assertTestRunTransition } from "../workflow";
import { buildManualScenarioId, manualScenarioPrefix } from "./shared";

export async function generateTestPlan(engagementId: string, actorName: string) {
  return runInTransaction(async (db) => {
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, engagementId))
      .limit(1);

    if (!engagement) {
      throw new Error("Engagement not found.");
    }

    const priorRuns = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.engagementId, engagementId))
      .orderBy(desc(testRuns.createdAt));
    const latestPriorRun = priorRuns[0] ?? null;
    const latestPriorScenarioRows: Array<typeof scenarioRuns.$inferSelect> = latestPriorRun
      ? await db.select().from(scenarioRuns).where(eq(scenarioRuns.testRunId, latestPriorRun.id))
      : [];
    const selected = selectScenarios(engagement.targetIdp, engagement.claimedFeatures);
    const carriedManualScenarios = latestPriorScenarioRows
      .filter((scenario) => scenario.scenarioId.startsWith(manualScenarioPrefix))
      .map((scenario) => ({
        scenarioId: scenario.scenarioId,
        title: scenario.title || scenario.scenarioId,
        executionMode: scenario.executionMode as "manual" | "guided",
        protocol: scenario.protocol as "saml" | "scim" | "ops",
        defaultSeverity: "needs-clarification" as const,
        reviewerNotes: scenario.reviewerNotes || "",
        customerVisibleSummary: scenario.customerVisibleSummary || "",
        buyerSafeReportNote: scenario.buyerSafeReportNote || "",
      }));
    const combinedScenarios = [...selected];

    for (const manualScenario of carriedManualScenarios) {
      if (!combinedScenarios.some((scenario) => scenario.scenarioId === manualScenario.scenarioId)) {
        combinedScenarios.push(manualScenario);
      }
    }
    const timestamp = now();
    const run = {
      id: makeId("run"),
      engagementId,
      label:
        priorRuns.length === 0
          ? `Default ${engagement.targetIdp} readiness plan`
          : `Retest ${priorRuns.length + 1} ${engagement.targetIdp} readiness plan`,
      status: combinedScenarios.length === 0 ? "completed" : "running",
      notes:
        carriedManualScenarios.length > 0
          ? "Generated from target IdP and claimed features, with carried forward manual scenarios from the previous cycle."
          : "Generated from target IdP and claimed features.",
      scenarioIds: combinedScenarios.map((scenario) => scenario.scenarioId),
      createdAt: timestamp,
      completedAt: combinedScenarios.length === 0 ? timestamp : null,
    };

    await db.insert(testRuns).values(run);
    if (combinedScenarios.length > 0) {
      await db.insert(scenarioRuns).values(
        combinedScenarios.map((scenario) => ({
          id: makeId("scenario"),
          testRunId: run.id,
          scenarioId: scenario.scenarioId,
          title: scenario.title,
          status: "queued",
          outcome: "pending",
          executionMode: scenario.executionMode,
          protocol: scenario.protocol,
          reviewerNotes: "reviewerNotes" in scenario ? scenario.reviewerNotes : "",
          customerVisibleSummary: "customerVisibleSummary" in scenario ? scenario.customerVisibleSummary : "",
          buyerSafeReportNote: "buyerSafeReportNote" in scenario ? scenario.buyerSafeReportNote : "",
          evidence: [],
          updatedAt: timestamp,
        })),
      );
    }

    const nextEngagementStatus = priorRuns.length === 0 ? "in-progress" : "retest";
    assertEngagementTransition(engagement.status, nextEngagementStatus);
    await db
      .update(engagements)
      .set({
        status: nextEngagementStatus,
        updatedAt: timestamp,
      })
      .where(eq(engagements.id, engagementId));
    await audit(actorName, "generated_test_plan", "test_run", run.id, {
      engagementId,
      scenarioCount: combinedScenarios.length,
      carriedManualScenarioCount: carriedManualScenarios.length,
    }, db);
    return run;
  });
}

export async function addManualScenario(input: {
  engagementId: string;
  title: string;
  protocol: "saml" | "scim" | "ops";
  executionMode: "manual" | "guided";
  reviewerNotes: string;
  customerVisibleSummary: string;
  buyerSafeReportNote: string;
  actorName: string;
}) {
  return runInTransaction(async (db) => {
    const [engagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.id, input.engagementId))
      .limit(1);

    if (!engagement) {
      throw new Error("Engagement not found.");
    }

    const runs = await db
      .select()
      .from(testRuns)
      .where(eq(testRuns.engagementId, input.engagementId))
      .orderBy(desc(testRuns.createdAt))
      .limit(1);
    let run = runs[0] ?? null;
    const timestamp = now();

    if (!run) {
      run = {
        id: makeId("run"),
        engagementId: input.engagementId,
        label: `Manual ${engagement.targetIdp} review plan`,
        status: "running",
        notes: "Created from founder-defined scenario coverage.",
        scenarioIds: [],
        createdAt: timestamp,
        completedAt: null,
      };
      await db.insert(testRuns).values(run);
    }

    const scenarioId = buildManualScenarioId(input.protocol, input.title);
    const [existingScenarioRun] = await db
      .select()
      .from(scenarioRuns)
      .where(and(eq(scenarioRuns.testRunId, run.id), eq(scenarioRuns.scenarioId, scenarioId)))
      .limit(1);

    if (existingScenarioRun) {
      throw new Error("This manual scenario already exists in the current test cycle.");
    }

    const scenarioRun = {
      id: makeId("scenario"),
      testRunId: run.id,
      scenarioId,
      title: input.title,
      status: "queued",
      outcome: "pending",
      executionMode: input.executionMode,
      protocol: input.protocol,
      reviewerNotes: input.reviewerNotes,
      customerVisibleSummary: input.customerVisibleSummary,
      buyerSafeReportNote: input.buyerSafeReportNote,
      evidence: [],
      updatedAt: timestamp,
    };

    await db.insert(scenarioRuns).values(scenarioRun);
    const mergedScenarioIds = Array.from(new Set([...(run.scenarioIds || []), scenarioId]));
    assertTestRunTransition(run.status, "running");
    await db
      .update(testRuns)
      .set({
        scenarioIds: mergedScenarioIds,
        status: "running",
        completedAt: null,
      })
      .where(eq(testRuns.id, run.id));
    const nextEngagementStatus = runs[0] ? "retest" : "in-progress";
    assertEngagementTransition(engagement.status, nextEngagementStatus);
    await db
      .update(engagements)
      .set({
        status: nextEngagementStatus,
        updatedAt: timestamp,
      })
      .where(eq(engagements.id, input.engagementId));
    await audit(input.actorName, "added_manual_scenario", "scenario_run", scenarioRun.id, {
      engagementId: input.engagementId,
      protocol: input.protocol,
      executionMode: input.executionMode,
    }, db);

    return scenarioRun;
  });
}

export async function listScenariosForRun(runId: string) {
  const db = await getDb();
  const scenarioRows = (await db
    .select()
    .from(scenarioRuns)
    .where(eq(scenarioRuns.testRunId, runId))) as Array<typeof scenarioRuns.$inferSelect>;
  return scenarioRows.map((row: typeof scenarioRuns.$inferSelect) => ({
    ...row,
    definition: scenarioLibrary.find((scenario) => scenario.id === row.scenarioId),
  }));
}
