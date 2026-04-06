import {
  buildFindingTemplate,
  type ClaimedFeature,
  type IdpProvider,
  scenarioLibrary,
  selectScenarios,
} from "@assurance/core";
import { and, desc, eq } from "drizzle-orm";
import { getDb, runInTransaction } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import {
  attachments,
  engagements,
  findings,
  jobRuns,
  leads,
  messages,
  reports,
  scenarioRuns,
  testRuns,
} from "./schema";
import { AttachmentLinkageError } from "../errors";

const manualScenarioPrefix = "manual:";

function slugifyManualScenarioTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildManualScenarioId(protocol: string, title: string) {
  return `${manualScenarioPrefix}${protocol}:${slugifyManualScenarioTitle(title) || "custom-check"}`;
}

function buildFindingKey(input: {
  scenarioId: string;
  protocol: string;
  title: string | null;
}) {
  if (input.scenarioId.startsWith(manualScenarioPrefix)) {
    return input.scenarioId;
  }

  const titleToken = slugifyManualScenarioTitle(input.title || input.scenarioId);
  return `${input.protocol}:${input.scenarioId}:${titleToken}`;
}

function buildScenarioFindingTemplate(input: {
  scenarioId: string;
  title: string | null;
  protocol: string;
  reviewerNotes: string;
  customerVisibleSummary: string;
  buyerSafeReportNote: string;
}) {
  const template = buildFindingTemplate(input.scenarioId);

  if (template) {
    return template;
  }

  const scenarioTitle = input.title || input.scenarioId;
    return {
      title: `${scenarioTitle} requires remediation`,
      severity: "needs-clarification" as const,
      customerImpact:
        "A customer-specific identity scenario remains unresolved and should be reviewed before go-live.",
      remediation:
        "Reproduce the behavior, document the expected state, and assign a concrete remediation owner before rollout.",
      buyerSafeNote:
        input.buyerSafeReportNote
          || input.customerVisibleSummary
          || input.reviewerNotes
          || "A manually scoped rollout scenario remains unresolved and should be reviewed before launch.",
    };
  }

export async function convertLeadToEngagement(
  leadId: string,
  ownerName: string,
  ownerUserId?: string | null,
) {
  return runInTransaction(async (db) => {
    const [existingEngagement] = await db
      .select()
      .from(engagements)
      .where(eq(engagements.leadId, leadId))
      .limit(1);

    if (existingEngagement) {
      return existingEngagement;
    }

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

    if (!lead) {
      throw new Error("Lead not found.");
    }

    const timestamp = now();
    const engagement = {
      id: makeId("eng"),
      leadId: lead.id,
      title: `${lead.intake.companyName} <> ${lead.intake.targetCustomer} Deal Rescue`,
      companyName: lead.intake.companyName,
      ownerUserId: ownerUserId || null,
      status: "qualified" as const,
      productUrl: lead.intake.productUrl,
      targetCustomer: lead.intake.targetCustomer,
      deadline: lead.intake.deadline,
      targetIdp: lead.intake.targetIdp,
      claimedFeatures: lead.intake.requiredFlows,
      qualification: {
        acvPotential: "Need confirmation",
        urgency: lead.intake.timeline,
        namedDeadline: lead.intake.deadline,
        existingSupport: "Claimed in intake",
        stagingAccessConfirmed: false,
      },
      environment: {
        name: "Primary staging tenant",
        url: lead.intake.productUrl,
        stage: "staging" as const,
      },
      idpProfile: {
        provider: lead.intake.targetIdp,
        profileName: `${lead.intake.targetIdp} primary profile`,
        notes: lead.intake.authNotes,
      },
      intake: lead.intake,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(engagements).values(engagement);
    await db
      .update(leads)
      .set({
        status: "converted",
        updatedAt: timestamp,
      })
      .where(eq(leads.id, leadId));
    await audit(ownerName, "converted_lead", "engagement", engagement.id, {
      leadId,
    }, db);
    return engagement;
  });
}

export async function createEngagement(input: {
  title: string;
  companyName: string;
  productUrl: string;
  targetCustomer: string;
  targetIdp: IdpProvider;
  deadline?: string;
  claimedFeatures: ClaimedFeature[];
  actorName: string;
  ownerUserId?: string | null;
}) {
  const db = await getDb();
  const timestamp = now();
  const engagement = {
    id: makeId("eng"),
    leadId: null,
    title: input.title,
    companyName: input.companyName,
    ownerUserId: input.ownerUserId || null,
    status: "qualified" as const,
    productUrl: input.productUrl,
    targetCustomer: input.targetCustomer,
    deadline: input.deadline || null,
    targetIdp: input.targetIdp,
    claimedFeatures: input.claimedFeatures,
    qualification: {
      acvPotential: "Unspecified",
      urgency: "Active deal",
      namedDeadline: input.deadline || "",
      existingSupport: "Founder-created engagement",
      stagingAccessConfirmed: false,
    },
    environment: {
      name: "Staging",
      url: input.productUrl,
      stage: "staging" as const,
    },
    idpProfile: {
      provider: input.targetIdp,
      profileName: `${input.targetIdp} profile`,
      notes: "",
    },
    intake: {
      companyName: input.companyName,
      contactName: input.actorName,
      contactEmail: "",
      productUrl: input.productUrl,
      dealStage: "Founder-created",
      targetCustomer: input.targetCustomer,
      targetIdp: input.targetIdp,
      requiredFlows: input.claimedFeatures,
      authNotes: "",
      stagingAccessMethod: "",
      timeline: "",
      deadline: input.deadline || "",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.insert(engagements).values(engagement);
  await audit(input.actorName, "created_engagement", "engagement", engagement.id, {
    targetCustomer: input.targetCustomer,
  });
  return engagement;
}

export async function getEngagementDetail(engagementId: string) {
  const db = await getDb();
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
    ? await db.select().from(scenarioRuns).where(eq(scenarioRuns.testRunId, latestRun.id))
    : [];
  const findingRows = await db
    .select()
    .from(findings)
    .where(eq(findings.engagementId, engagementId))
    .orderBy(desc(findings.createdAt));
  const messageRows = await db
    .select()
    .from(messages)
    .where(eq(messages.engagementId, engagementId))
    .orderBy(desc(messages.createdAt));
  const reportRows = await db
    .select()
    .from(reports)
    .where(eq(reports.engagementId, engagementId))
    .orderBy(desc(reports.version));
  const jobRows = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.engagementId, engagementId))
    .orderBy(desc(jobRuns.createdAt));
  const attachmentRows = await db
    .select()
    .from(attachments)
    .where(eq(attachments.engagementId, engagementId))
    .orderBy(desc(attachments.createdAt));

  return {
    engagement,
    latestRun,
    scenarioRows,
    findingRows,
    messageRows,
    reportRows,
    jobRows,
    attachmentRows,
  };
}

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

    await db
      .update(engagements)
      .set({
        status: priorRuns.length === 0 ? "in-progress" : "retest",
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
    await db
      .update(testRuns)
      .set({
        scenarioIds: mergedScenarioIds,
        status: "running",
        completedAt: null,
      })
      .where(eq(testRuns.id, run.id));
    await db
      .update(engagements)
      .set({
        status: runs[0] ? "retest" : "in-progress",
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
    await db
      .update(testRuns)
      .set({
        status: outstandingCount > 0 ? "running" : "completed",
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

export async function addMessage(input: {
  engagementId: string;
  authorName: string;
  body: string;
  visibility: "shared" | "internal";
}) {
  const db = await getDb();
  const message = {
    id: makeId("message"),
    engagementId: input.engagementId,
    authorName: input.authorName,
    body: input.body,
    visibility: input.visibility,
    createdAt: now(),
  };
  await db.insert(messages).values(message);
  await audit(input.authorName, "added_message", "engagement", input.engagementId, {
    visibility: input.visibility,
  });
  return message;
}

export async function registerAttachment(input: {
  engagementId: string;
  uploadedBy: string;
  visibility: "shared" | "internal";
  fileName: string;
  storageKey: string;
  checksumSha256?: string | null;
  contentType: string;
  size: number;
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
      contentType: input.contentType,
      size: input.size,
      createdAt: now(),
      deletedAt: null,
    };
    await db.insert(attachments).values(attachment);

    if (attachment.scenarioRunId) {
      const [scenarioRun] = await db
        .select()
        .from(scenarioRuns)
        .where(eq(scenarioRuns.id, attachment.scenarioRunId))
        .limit(1);

      if (scenarioRun) {
        const evidence = Array.isArray(scenarioRun.evidence) ? scenarioRun.evidence : [];
        if (!evidence.includes(attachment.id)) {
          await db
            .update(scenarioRuns)
            .set({
              evidence: [...evidence, attachment.id],
              updatedAt: now(),
            })
            .where(eq(scenarioRuns.id, attachment.scenarioRunId));
        }
      }
    }
    await audit(input.uploadedBy, "uploaded_attachment", "attachment", attachment.id, {
      engagementId: input.engagementId,
      fileName: input.fileName,
      visibility: input.visibility,
      scenarioRunId: input.scenarioRunId || null,
      findingId: input.findingId || null,
      reportId: input.reportId || null,
    }, db);
    return attachment;
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
