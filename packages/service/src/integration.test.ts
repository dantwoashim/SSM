import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";

function makeStateRoot() {
  return path.join(os.tmpdir(), `assurance-service-${randomUUID()}`);
}

async function bootService(stateRoot: string) {
  process.env.NODE_ENV = "test";
  process.env.ASSURANCE_STATE_DIR = stateRoot;
  process.env.APP_URL = "https://app.example.com";
  process.env.FOUNDER_EMAIL = "owner@example.com";
  process.env.FOUNDER_PASSWORD = "StartHere123!";
  process.env.FOUNDER_NAME = "Founder";

  vi.resetModules();

  const service = await import("./index");
  const client = await import("./data/client");

  return {
    ...service,
    ...client,
  };
}

afterEach(async () => {
  vi.resetModules();
});

describe("service integration", () => {
  test("lead conversion, scenario review, evidence linkage, and report publication work end to end", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const lead = await service.createLead({
        companyName: "Acme SaaS",
        contactName: "Nadia Founder",
        contactEmail: "nadia@acme.example",
        productUrl: "https://staging.acme.example",
        dealStage: "Security review",
        targetCustomer: "Northwind Financial",
        targetIdp: "entra",
        requiredFlows: [
          "sp-initiated-sso",
          "group-role-mapping",
          "auditability",
        ],
        authNotes: "Need buyer-safe proof for group sync and sign-in.",
        stagingAccessMethod: "Shared review tenant",
        timeline: "This week",
        deadline: "2026-04-30",
      });

      const firstEngagement = await service.convertLeadToEngagement(lead.id, founder.name);
      const secondEngagement = await service.convertLeadToEngagement(lead.id, founder.name);
      expect(secondEngagement.id).toBe(firstEngagement.id);

      const run = await service.generateTestPlan(firstEngagement.id, founder.name);
      const detailAfterPlan = await service.getEngagementDetail(firstEngagement.id);
      expect(detailAfterPlan?.latestRun?.id).toBe(run.id);
      expect(detailAfterPlan?.scenarioRows.length).toBeGreaterThan(0);

      const scenarioRows = detailAfterPlan?.scenarioRows ?? [];
      const failingScenario = scenarioRows.find((row: { scenarioId: string }) => row.scenarioId === "group-role-mapping") ?? scenarioRows[0];
      expect(failingScenario).toBeTruthy();

      await service.registerAttachment({
        engagementId: firstEngagement.id,
        uploadedBy: founder.name,
        visibility: "shared",
        fileName: "group-mapping-screenshot.png",
        storageKey: "artifacts/group-mapping-screenshot.png",
        contentType: "image/png",
        size: 2048,
        scenarioRunId: failingScenario.id,
      });

      await service.updateScenarioRunResult({
        scenarioRunId: failingScenario.id,
        outcome: "failed",
        reviewerNotes: "Finance-Admin was mapped to viewer instead of admin.",
        actorName: founder.name,
      });

      for (const scenario of scenarioRows.filter((row: { id: string }) => row.id !== failingScenario.id)) {
        await service.updateScenarioRunResult({
          scenarioRunId: scenario.id,
          outcome: "passed",
          reviewerNotes: `${scenario.title || scenario.scenarioId} completed successfully.`,
          actorName: founder.name,
        });
      }

      const detailAfterReview = await service.getEngagementDetail(firstEngagement.id);
      const linkedFinding = detailAfterReview?.findingRows.find(
        (finding: { scenarioRunId: string | null }) => finding.scenarioRunId === failingScenario.id,
      );
      expect(linkedFinding?.status).toBe("open");
      expect(detailAfterReview?.latestRun?.completedAt).toBeTruthy();

      await service.registerAttachment({
        engagementId: firstEngagement.id,
        uploadedBy: founder.name,
        visibility: "shared",
        fileName: "buyer-facing-finding.pdf",
        storageKey: "artifacts/buyer-facing-finding.pdf",
        contentType: "application/pdf",
        size: 4096,
        findingId: linkedFinding?.id ?? null,
      });

      const report = await service.generateReport(firstEngagement.id, founder.name);
      expect(report.status).toBe("draft");

      const detailAfterReport = await service.getEngagementDetail(firstEngagement.id);
      const latestReport = detailAfterReport?.reportRows[0];
      expect(latestReport?.reportJson.scenarios.some((scenario: { evidenceCount: number }) => scenario.evidenceCount > 0)).toBe(true);
      expect(latestReport?.reportJson.findings.some((finding: { evidenceCount: number }) => finding.evidenceCount > 0)).toBe(true);

      await service.publishReport(report.id, founder.name);

      const detailAfterPublish = await service.getEngagementDetail(firstEngagement.id);
      expect(detailAfterPublish?.reportRows[0]?.status).toBe("published");
      expect(detailAfterPublish?.engagement.status).toBe("report-ready");
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("invite issuance is idempotent and accepted customers get scoped access", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const engagement = await service.createEngagement({
        title: "Acme <> Fabrikam Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Fabrikam",
        targetIdp: "okta",
        deadline: "2026-05-10",
        claimedFeatures: ["sp-initiated-sso", "scim-create"],
        actorName: founder.name,
      });

      const firstInvite = await service.createInvite({
        email: "it-admin@fabrikam.example",
        name: "Fabrikam IT",
        role: "customer",
        engagementId: engagement.id,
        createdBy: founder.name,
      });

      const secondInvite = await service.createInvite({
        email: "it-admin@fabrikam.example",
        name: "Fabrikam IAM",
        role: "customer",
        engagementId: engagement.id,
        createdBy: founder.name,
      });

      expect(secondInvite.invite.id).toBe(firstInvite.invite.id);

      const acceptance = await service.acceptInvite({
        token: secondInvite.inviteUrl.split("/").pop() || "",
        password: "CustomerPass123!",
      });

      expect(acceptance.user.email).toBe("it-admin@fabrikam.example");
      expect(await service.getInviteByToken(secondInvite.inviteUrl.split("/").pop() || "")).toBeNull();

      const hasAccess = await service.hasEngagementAccess({
        userId: acceptance.user.id,
        role: acceptance.user.role,
        engagementId: engagement.id,
      });
      expect(hasAccess).toBe(true);

      const portal = await service.listPortalDataForUser({
        userId: acceptance.user.id,
        role: acceptance.user.role,
      });
      expect(portal.engagements.map((item: { id: string }) => item.id)).toContain(engagement.id);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("queued jobs execute directly against the service layer and complete their job runs", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const engagement = await service.createEngagement({
        title: "Acme <> Contoso Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Contoso",
        targetIdp: "entra",
        deadline: "2026-05-12",
        claimedFeatures: ["sp-initiated-sso", "auditability"],
        actorName: founder.name,
      });

      const jobRun = await service.createJobRun({
        engagementId: engagement.id,
        name: "test-plan.generate",
        actorName: founder.name,
        payload: { trigger: "integration-test" },
      });

      const result = await service.executeQueuedJob({
        name: "test-plan.generate",
        data: {
          engagementId: engagement.id,
          actorName: founder.name,
          jobRunId: jobRun.id,
        },
      });

      expect(result.type).toBe("test-plan.generate");

      const detail = await service.getEngagementDetail(engagement.id);
      expect(detail?.jobRows[0]?.status).toBe("completed");
      expect(detail?.latestRun?.scenarioIds.length).toBeGreaterThan(0);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
