import { count, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import { engagements, findings, leads, reports } from "./schema";

export interface DashboardData {
  leads: Array<typeof leads.$inferSelect>;
  engagements: Array<typeof engagements.$inferSelect>;
  openFindings: number;
  publishedReports: number;
}

export async function listDashboardData(): Promise<DashboardData> {
  const db = await getDb();
  const leadRows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(10);
  const engagementRows = await db
    .select()
    .from(engagements)
    .orderBy(desc(engagements.updatedAt))
    .limit(12);
  const [{ value: openFindingCount }] = await db
    .select({ value: count() })
    .from(findings)
    .where(eq(findings.status, "open"));
  const [{ value: publishedReportCount }] = await db
    .select({ value: count() })
    .from(reports)
    .where(eq(reports.status, "published"));

  return {
    leads: leadRows,
    engagements: engagementRows,
    openFindings: Number(openFindingCount),
    publishedReports: Number(publishedReportCount),
  };
}
