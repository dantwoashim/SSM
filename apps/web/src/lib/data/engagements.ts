import {
  buildFindingTemplate,
  type ClaimedFeature,
  type IdpProvider,
  scenarioLibrary,
  selectScenarios,
} from "@assurance/core";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
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

export async function convertLeadToEngagement(leadId: string, ownerName: string) {
  const db = await getDb();
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
    ownerUserId: null,
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
  });
  return engagement;
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
}) {
  const db = await getDb();
  const timestamp = now();
  const engagement = {
    id: makeId("eng"),
    leadId: null,
    title: input.title,
    companyName: input.companyName,
    ownerUserId: null,
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
  const db = await getDb();
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId))
    .limit(1);

  if (!engagement) {
    throw new Error("Engagement not found.");
  }

  const selected = selectScenarios(engagement.targetIdp, engagement.claimedFeatures);
  const timestamp = now();
  const run = {
    id: makeId("run"),
    engagementId,
    label: `Default ${engagement.targetIdp} readiness plan`,
    status: selected.length === 0 ? "completed" : "running",
    notes: "Generated from target IdP and claimed features.",
    scenarioIds: selected.map((scenario) => scenario.scenarioId),
    createdAt: timestamp,
    completedAt: selected.length === 0 ? timestamp : null,
  };

  await db.insert(testRuns).values(run);
  if (selected.length > 0) {
    await db.insert(scenarioRuns).values(
      selected.map((scenario) => ({
        id: makeId("scenario"),
        testRunId: run.id,
        scenarioId: scenario.scenarioId,
        title: scenario.title,
        status: "queued",
        outcome: "pending",
        executionMode: scenario.executionMode,
        protocol: scenario.protocol,
        reviewerNotes: "",
        evidence: [],
        updatedAt: timestamp,
      })),
    );
  }

  await db
    .update(engagements)
    .set({
      status: "in-progress",
      updatedAt: timestamp,
    })
    .where(eq(engagements.id, engagementId));
  await audit(actorName, "generated_test_plan", "test_run", run.id, {
    engagementId,
    scenarioCount: selected.length,
  });
  return run;
}

export async function addManualScenario(input: {
  engagementId: string;
  title: string;
  protocol: "saml" | "oidc" | "scim" | "ops";
  executionMode: "manual" | "guided" | "automated";
  reviewerNotes: string;
  actorName: string;
}) {
  const db = await getDb();
  const detail = await getEngagementDetail(input.engagementId);

  if (!detail) {
    throw new Error("Engagement not found.");
  }

  let run = detail.latestRun;
  const timestamp = now();

  if (!run) {
    run = {
      id: makeId("run"),
      engagementId: input.engagementId,
      label: `Manual ${detail.engagement.targetIdp} review plan`,
      status: "running",
      notes: "Created from founder-defined scenario coverage.",
      scenarioIds: [],
      createdAt: timestamp,
      completedAt: null,
    };
    await db.insert(testRuns).values(run);
  }

  const scenarioId = `manual-${makeId("scenario")}`;
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
      status: "in-progress",
      updatedAt: timestamp,
    })
    .where(eq(engagements.id, input.engagementId));
  await audit(input.actorName, "added_manual_scenario", "scenario_run", scenarioRun.id, {
    engagementId: input.engagementId,
    protocol: input.protocol,
    executionMode: input.executionMode,
  });

  return scenarioRun;
}

export async function updateScenarioRunResult(input: {
  scenarioRunId: string;
  outcome: "pending" | "passed" | "failed" | "skipped";
  reviewerNotes: string;
  actorName: string;
}) {
  const db = await getDb();
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
      updatedAt: timestamp,
    })
    .where(eq(scenarioRuns.id, input.scenarioRunId));

  const template = buildFindingTemplate(scenarioRun.scenarioId);
  const [existingFinding] = await db
    .select()
    .from(findings)
    .where(and(eq(findings.scenarioRunId, scenarioRun.id), eq(findings.testRunId, testRun.id)))
    .limit(1);

  if (input.outcome === "failed" && template) {
    if (existingFinding) {
      await db
        .update(findings)
        .set({
          severity: template.severity,
          customerImpact: template.customerImpact,
          summary: input.reviewerNotes || template.customerImpact,
          remediation: template.remediation,
          buyerSafeNote: template.buyerSafeNote,
          status: "open",
          updatedAt: timestamp,
        })
        .where(eq(findings.id, existingFinding.id));
    } else {
      await db.insert(findings).values({
        id: makeId("finding"),
        engagementId: engagement.id,
        testRunId: testRun.id,
        scenarioRunId: scenarioRun.id,
        title: template.title,
        severity: template.severity,
        customerImpact: template.customerImpact,
        summary: input.reviewerNotes || template.customerImpact,
        rootCause: null,
        remediation: template.remediation,
        ownerHint: "Engineering owner",
        buyerSafeNote: template.buyerSafeNote,
        status: "open",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  if (input.outcome === "passed" && existingFinding) {
    await db
      .update(findings)
      .set({
        status: "resolved",
        updatedAt: timestamp,
      })
      .where(eq(findings.id, existingFinding.id));
  }

  if (input.outcome === "skipped" && existingFinding) {
    await db
      .update(findings)
      .set({
        status: "resolved",
        updatedAt: timestamp,
      })
      .where(eq(findings.id, existingFinding.id));
  }

  if (input.outcome === "pending" && existingFinding) {
    await db
      .update(findings)
      .set({
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
  contentType: string;
  size: number;
  scenarioRunId?: string | null;
  findingId?: string | null;
  reportId?: string | null;
}) {
  const db = await getDb();
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
    contentType: input.contentType,
    size: input.size,
    createdAt: now(),
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
  });
  return attachment;
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
