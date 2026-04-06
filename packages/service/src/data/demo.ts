import { eq } from "drizzle-orm";
import { listDashboardData } from "./dashboard";
import { createLead } from "./leads";
import {
  addMessage,
  convertLeadToEngagement,
  generateTestPlan,
  getEngagementDetail,
  updateScenarioRunResult,
} from "./engagements";
import { publishReport, generateReport } from "./reports";
import { ensureFounderUser } from "./users";
import { engagements } from "./schema";
import { getDb } from "./client";

export async function seedDemoData() {
  const founder = await ensureFounderUser();
  const dashboard = await listDashboardData();

  if (dashboard.engagements.length > 0 || dashboard.leads.length > 0) {
    return founder;
  }

  const lead = await createLead({
    companyName: "Acme SaaS",
    contactName: founder.name,
    contactEmail: founder.email,
    productUrl: "https://staging.acme.example",
    dealStage: "Security review",
    targetCustomer: "Northwind Financial",
    targetIdp: "entra",
    requiredFlows: [
      "sp-initiated-sso",
      "idp-initiated-sso",
      "scim-create",
      "scim-deactivate",
      "group-role-mapping",
      "tenant-isolation",
      "auditability",
    ],
    authNotes: "Current rollout stalls on role mapping and SCIM deactivation proof.",
    stagingAccessMethod: "Founder-managed review tenant",
    timeline: "Need packet before Friday procurement review",
    deadline: "2026-03-13",
  });

  const engagement = await convertLeadToEngagement(lead.id, founder.name);
  await generateTestPlan(engagement.id, founder.name);
  const detail = await getEngagementDetail(engagement.id);
  const scenarioRows =
    (detail?.scenarioRows as Array<{
      id: string;
      scenarioId: string;
      title?: string | null;
    }>) || [];
  const passingScenario = scenarioRows.find((row) => row.scenarioId === "sso-sp-initiated");
  const failingScenario = scenarioRows.find((row) => row.scenarioId === "group-role-mapping");

  if (passingScenario) {
    await updateScenarioRunResult({
      scenarioRunId: passingScenario.id,
      outcome: "passed",
      reviewerNotes: "SP-initiated sign-in resolved to the correct tenant and baseline role.",
      customerVisibleSummary: "SP-initiated sign-in resolved to the correct tenant and baseline role.",
      buyerSafeReportNote: "SP-initiated sign-in completed successfully during the staged validation cycle.",
      actorName: founder.name,
    });
  }

  if (failingScenario) {
    await updateScenarioRunResult({
      scenarioRunId: failingScenario.id,
      outcome: "failed",
      reviewerNotes: "Finance-Admin synced to viewer on first assignment.",
      customerVisibleSummary: "Finance-Admin did not receive the intended role during the initial sync.",
      buyerSafeReportNote: "Group-to-role mapping under-assigned access during the staged validation cycle.",
      actorName: founder.name,
    });
  }

  for (const scenario of scenarioRows.filter((row) => row.id !== passingScenario?.id && row.id !== failingScenario?.id)) {
    const scenarioLabel = scenario.title || scenario.scenarioId;
    await updateScenarioRunResult({
      scenarioRunId: scenario.id,
      outcome: "passed",
      reviewerNotes: `${scenarioLabel} completed successfully in the staged tenant.`,
      customerVisibleSummary: `${scenarioLabel} behaved as expected in the staged tenant.`,
      buyerSafeReportNote: `${scenarioLabel} completed successfully during the current validation cycle.`,
      actorName: founder.name,
    });
  }

  await addMessage({
    engagementId: engagement.id,
    authorName: founder.name,
    visibility: "shared",
    body: "Initial readiness pass complete. Waiting for Northwind-specific group mapping confirmation.",
  });

  const report = await generateReport(engagement.id, founder.name);
  await publishReport(report.id, founder.name, true);

  const db = await getDb();
  await db
    .update(engagements)
    .set({
      status: "report-ready",
    })
    .where(eq(engagements.id, engagement.id));

  return founder;
}
