import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "./client";
import { engagementMemberships, engagements, findings, invites, jobRuns, leads, reports, users } from "./schema";

export async function getUserById(userId: string) {
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function hasEngagementAccess(input: {
  userId: string;
  role: string;
  engagementId: string;
}) {
  if (input.role === "founder") {
    return true;
  }

  const db = await getDb();
  const memberships = await db
    .select()
    .from(engagementMemberships)
    .where(eq(engagementMemberships.userId, input.userId));

  return memberships.some((entry: typeof engagementMemberships.$inferSelect) => entry.engagementId === input.engagementId);
}

export async function listPortalDataForUser(input: {
  userId: string;
  role: string;
}) {
  const db = await getDb();

  if (input.role === "founder") {
    const leadRows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(10);
    const engagementRows = await db
      .select()
      .from(engagements)
      .orderBy(desc(engagements.updatedAt))
      .limit(20);
    const openInviteRows = await db
      .select()
      .from(invites)
      .where(isNull(invites.acceptedAt))
      .limit(20);
    const recentJobRuns = await db
      .select()
      .from(jobRuns)
      .orderBy(desc(jobRuns.updatedAt))
      .limit(10);
    const activeJobRuns = await db
      .select()
      .from(jobRuns)
      .where(or(eq(jobRuns.status, "queued"), eq(jobRuns.status, "running")));
    const openFindingRows = await db.select().from(findings).where(eq(findings.status, "open"));
    const publishedReportRows = await db
      .select()
      .from(reports)
      .where(eq(reports.status, "published"));

    return {
      leads: leadRows,
      engagements: engagementRows,
      openInvites: openInviteRows,
      recentJobRuns,
      activeJobCount: activeJobRuns.length,
      openFindingCount: openFindingRows.length,
      publishedReportCount: publishedReportRows.length,
    };
  }

  const memberships = await db
    .select()
    .from(engagementMemberships)
    .where(eq(engagementMemberships.userId, input.userId));
  const engagementIds = memberships.map(
    (membership: typeof engagementMemberships.$inferSelect) => membership.engagementId,
  );
  const engagementRows =
    engagementIds.length === 0
      ? []
      : await db
          .select()
          .from(engagements)
          .where(inArray(engagements.id, engagementIds));
  const openFindingRows =
    engagementIds.length === 0
      ? []
      : await db
          .select()
          .from(findings)
          .where(and(inArray(findings.engagementId, engagementIds), eq(findings.status, "open")));
  const publishedReportRows =
    engagementIds.length === 0
      ? []
      : await db
          .select()
          .from(reports)
          .where(and(inArray(reports.engagementId, engagementIds), eq(reports.status, "published")));

  return {
    leads: [],
    engagements: engagementRows,
    openInvites: [],
    recentJobRuns: [],
    activeJobCount: 0,
    openFindingCount: openFindingRows.length,
    publishedReportCount: publishedReportRows.length,
  };
}

export async function listOpenInvitesForEngagement(engagementId: string) {
  const db = await getDb();
  return db
    .select()
    .from(invites)
    .where(eq(invites.engagementId, engagementId))
    .then((rows: Array<typeof invites.$inferSelect>) =>
      rows.filter((row) => !row.acceptedAt),
    );
}

export async function listCustomerRecipientsForEngagement(engagementId: string) {
  const db = await getDb();
  const memberships = await db
    .select()
    .from(engagementMemberships)
    .where(eq(engagementMemberships.engagementId, engagementId));

  if (memberships.length === 0) {
    return [];
  }

  const userIds = memberships.map(
    (membership: typeof engagementMemberships.$inferSelect) => membership.userId,
  );
  const recipients = await db.select().from(users).where(inArray(users.id, userIds));
  return recipients.filter((user: typeof users.$inferSelect) => user.role !== "founder");
}
