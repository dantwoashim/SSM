import type { ClaimedFeature, IdpProvider } from "@assurance/core";
import { desc, eq } from "drizzle-orm";
import { getDb, runInTransaction } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
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
} from "../schema";

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
    attachmentRows: attachmentRows.filter((attachment: typeof attachments.$inferSelect) => !attachment.deletedAt),
  };
}
