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
        customerVisibleSummary: "Finance-Admin did not receive the intended admin role.",
        buyerSafeReportNote: "Group-to-role mapping under-assigned access during the staged validation cycle.",
        actorName: founder.name,
      });

      for (const scenario of scenarioRows.filter((row: { id: string }) => row.id !== failingScenario.id)) {
        await service.updateScenarioRunResult({
          scenarioRunId: scenario.id,
          outcome: "passed",
          reviewerNotes: `${scenario.title || scenario.scenarioId} completed successfully.`,
          customerVisibleSummary: `${scenario.title || scenario.scenarioId} completed successfully.`,
          buyerSafeReportNote: `${scenario.title || scenario.scenarioId} completed successfully during the current validation cycle.`,
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

      await service.publishReport(report.id, founder.name, true);

      const detailAfterPublish = await service.getEngagementDetail(firstEngagement.id);
      expect(detailAfterPublish?.reportRows[0]?.status).toBe("published");
      expect(detailAfterPublish?.engagement.status).toBe("report-ready");
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 30_000);

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

  test("a failed scenario can be resolved by a passing retest while skipped retests keep findings open", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const engagement = await service.createEngagement({
        title: "Acme <> Wide World Importers Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Wide World Importers",
        targetIdp: "entra",
        deadline: "2026-05-12",
        claimedFeatures: ["group-role-mapping", "auditability"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });

      const runOne = await service.generateTestPlan(engagement.id, founder.name);
      const runOneScenarios = await service.listScenariosForRun(runOne.id);
      const targetScenario = runOneScenarios.find((row: { scenarioId: string }) => row.scenarioId === "group-role-mapping") || runOneScenarios[0];

      await service.updateScenarioRunResult({
        scenarioRunId: targetScenario.id,
        outcome: "failed",
        reviewerNotes: "Finance Admin still maps to viewer.",
        customerVisibleSummary: "Finance Admin did not receive the intended role.",
        buyerSafeReportNote: "Group-to-role mapping did not produce the intended admin access during validation.",
        actorName: founder.name,
      });

      let detail = await service.getEngagementDetail(engagement.id);
      const originalFinding = detail?.findingRows.find((finding: { findingKey?: string | null }) => finding.findingKey);
      expect(originalFinding?.status).toBe("open");

      const runTwo = await service.generateTestPlan(engagement.id, founder.name);
      const runTwoScenarios = await service.listScenariosForRun(runTwo.id);
      const retestScenario = runTwoScenarios.find((row: { scenarioId: string }) => row.scenarioId === "group-role-mapping") || runTwoScenarios[0];

      await service.updateScenarioRunResult({
        scenarioRunId: retestScenario.id,
        outcome: "skipped",
        reviewerNotes: "Customer admin was unavailable for the retest window.",
        customerVisibleSummary: "The retest could not be completed because the customer admin was unavailable.",
        buyerSafeReportNote: "This scenario was skipped during the current cycle because the customer admin was unavailable.",
        actorName: founder.name,
      });

      detail = await service.getEngagementDetail(engagement.id);
      const stillOpenFinding = detail?.findingRows.find((finding: { id: string }) => finding.id === originalFinding?.id);
      expect(stillOpenFinding?.status).toBe("open");

      const runThree = await service.generateTestPlan(engagement.id, founder.name);
      const runThreeScenarios = await service.listScenariosForRun(runThree.id);
      const passingScenario = runThreeScenarios.find((row: { scenarioId: string }) => row.scenarioId === "group-role-mapping") || runThreeScenarios[0];

      await service.updateScenarioRunResult({
        scenarioRunId: passingScenario.id,
        outcome: "passed",
        reviewerNotes: "Admin group now lands on the correct role.",
        customerVisibleSummary: "The admin group now lands on the correct role.",
        buyerSafeReportNote: "The retest confirmed that group-to-role mapping now produces the intended admin access.",
        actorName: founder.name,
      });

      detail = await service.getEngagementDetail(engagement.id);
      const resolvedFinding = detail?.findingRows.find((finding: { id: string }) => finding.id === originalFinding?.id);
      expect(resolvedFinding?.status).toBe("resolved");
      expect(resolvedFinding?.lastObservedInRunId).toBe(runThree.id);
      expect(resolvedFinding?.resolvedAt).toBeTruthy();
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("manual scenario failures create findings and attachments cannot cross engagement scope", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const firstEngagement = await service.createEngagement({
        title: "Acme <> Tailspin Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Tailspin",
        targetIdp: "okta",
        deadline: "2026-05-21",
        claimedFeatures: ["sp-initiated-sso"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });
      const secondEngagement = await service.createEngagement({
        title: "Acme <> Alpine Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://preview.acme.example",
        targetCustomer: "Alpine",
        targetIdp: "okta",
        deadline: "2026-05-22",
        claimedFeatures: ["sp-initiated-sso"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });

      const manualScenario = await service.addManualScenario({
        engagementId: firstEngagement.id,
        title: "Customer-specific IdP bootstrap check",
        protocol: "ops",
        executionMode: "manual",
        reviewerNotes: "This customer provisions admins through a side channel before first login.",
        customerVisibleSummary: "This scenario validates the customer-specific bootstrap path for admin access.",
        buyerSafeReportNote: "A customer-specific bootstrap scenario was added to validate admin access before first login.",
        actorName: founder.name,
      });

      await service.updateScenarioRunResult({
        scenarioRunId: manualScenario.id,
        outcome: "failed",
        reviewerNotes: "Bootstrap admin landed without the required tenant binding.",
        customerVisibleSummary: "The bootstrap admin account did not land with the required tenant binding.",
        buyerSafeReportNote: "The customer-specific bootstrap path did not preserve the required tenant binding during validation.",
        actorName: founder.name,
      });

      const detail = await service.getEngagementDetail(firstEngagement.id);
      const manualFinding = detail?.findingRows.find((finding: { title: string }) => /customer-specific idp bootstrap check/i.test(finding.title));
      expect(manualFinding?.status).toBe("open");

      await expect(
        service.registerAttachment({
          engagementId: secondEngagement.id,
          uploadedBy: founder.name,
          visibility: "shared",
          fileName: "mismatch.txt",
          storageKey: "artifacts/mismatch.txt",
          contentType: "text/plain",
          size: 12,
          findingId: manualFinding?.id ?? null,
        }),
      ).rejects.toThrow(/linked finding does not belong to this engagement/i);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("existing users can claim access to a second engagement without recreating the account", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const firstEngagement = await service.createEngagement({
        title: "Acme <> Fabrikam Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Fabrikam",
        targetIdp: "okta",
        deadline: "2026-05-10",
        claimedFeatures: ["sp-initiated-sso", "scim-create"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });
      const secondEngagement = await service.createEngagement({
        title: "Acme <> Contoso Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://preview.acme.example",
        targetCustomer: "Contoso",
        targetIdp: "entra",
        deadline: "2026-05-11",
        claimedFeatures: ["sp-initiated-sso", "auditability"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });

      const firstInvite = await service.createInvite({
        email: "iam@customer.example",
        name: "Customer IAM",
        role: "customer",
        engagementId: firstEngagement.id,
        createdBy: founder.name,
      });
      const firstAcceptance = await service.acceptInvite({
        token: firstInvite.inviteUrl.split("/").pop() || "",
        password: "CustomerPass123!",
      });

      const secondInvite = await service.createInvite({
        email: "iam@customer.example",
        name: "Customer IAM",
        role: "customer",
        engagementId: secondEngagement.id,
        createdBy: founder.name,
      });
      const secondState = await service.getInviteAcceptanceState({
        token: secondInvite.inviteUrl.split("/").pop() || "",
      });
      expect(secondState?.mode).toBe("sign-in");

      const secondAcceptance = await service.acceptInvite({
        token: secondInvite.inviteUrl.split("/").pop() || "",
        currentUserId: firstAcceptance.user.id,
      });
      expect(secondAcceptance.user.id).toBe(firstAcceptance.user.id);

      const portal = await service.listPortalDataForUser({
        userId: firstAcceptance.user.id,
        role: firstAcceptance.user.role,
      });
      const engagementIds = portal.engagements.map((item: { id: string }) => item.id);
      expect(engagementIds).toContain(firstEngagement.id);
      expect(engagementIds).toContain(secondEngagement.id);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("accepted invites cannot be reused and wrong users cannot claim access", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      const founder = await service.ensureFounderUser();
      const engagement = await service.createEngagement({
        title: "Acme <> Adventure Works Deal Rescue",
        companyName: "Acme SaaS",
        productUrl: "https://staging.acme.example",
        targetCustomer: "Adventure Works",
        targetIdp: "entra",
        deadline: "2026-05-14",
        claimedFeatures: ["sp-initiated-sso", "auditability"],
        actorName: founder.name,
        ownerUserId: founder.id,
      });

      const invite = await service.createInvite({
        email: "iam@customer.example",
        name: "Customer IAM",
        role: "customer",
        engagementId: engagement.id,
        createdBy: founder.name,
      });

      const otherUserInvite = await service.createInvite({
        email: "other@customer.example",
        name: "Other User",
        role: "customer",
        engagementId: engagement.id,
        createdBy: founder.name,
      });

      const accepted = await service.acceptInvite({
        token: invite.inviteUrl.split("/").pop() || "",
        password: "CustomerPass123!",
      });

      await expect(
        service.acceptInvite({
          token: invite.inviteUrl.split("/").pop() || "",
          currentUserId: accepted.user.id,
        }),
      ).rejects.toThrow(/invite is invalid or expired/i);

      await service.acceptInvite({
        token: otherUserInvite.inviteUrl.split("/").pop() || "",
        password: "OtherUserPass123!",
      });

      const mismatchInvite = await service.createInvite({
        email: "other@customer.example",
        name: "Other User",
        role: "customer",
        engagementId: engagement.id,
        createdBy: founder.name,
      });

      await expect(
        service.acceptInvite({
          token: mismatchInvite.inviteUrl.split("/").pop() || "",
          currentUserId: accepted.user.id,
        }),
      ).rejects.toThrow(/belongs to other@customer.example/i);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 30_000);

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
  }, 30_000);

  test("rate limits enforce the configured ceiling across repeated calls", async () => {
    const stateRoot = makeStateRoot();
    const service = await bootService(stateRoot);

    try {
      await Promise.all([
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
      ]);

      await expect(
        service.enforceRateLimit({
          route: "lead-intake",
          bucketKey: "lead:test-ip",
          limit: 5,
          windowMs: 60_000,
        }),
      ).rejects.toThrow(/too many requests/i);
    } finally {
      await service.resetDatabaseForTests();
      await rm(stateRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
