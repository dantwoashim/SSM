import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEngagementDetail,
  hasEngagementAccess,
  listOpenInvitesForEngagement,
  listScenariosForRun,
} from "@/lib/data";
import { readEngagementFlashCookie } from "@/lib/engagement-flash";
import { getCurrentSession } from "@/lib/session";
import { ArtifactsSection } from "@/components/engagement-detail/artifacts-section";
import { CustomerAccessSection } from "@/components/engagement-detail/customer-access-section";
import { FindingsSection } from "@/components/engagement-detail/findings-section";
import { JobHistorySection } from "@/components/engagement-detail/job-history-section";
import { MessagesSection } from "@/components/engagement-detail/messages-section";
import { OverviewSection } from "@/components/engagement-detail/overview-section";
import { ReportSection } from "@/components/engagement-detail/report-section";
import { ScenarioSection } from "@/components/engagement-detail/scenario-section";
import type {
  AttachmentView,
  FindingView,
  JobRunView,
  MessageView,
  ScenarioReview,
} from "@/components/engagement-detail/types";

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session) {
    notFound();
  }

  const hasAccess = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId: id,
  });

  if (!hasAccess) {
    notFound();
  }

  const detail = await getEngagementDetail(id);

  if (!detail) {
    notFound();
  }

  const founderView = session.role === "founder";
  const scenarioRows: ScenarioReview[] = detail.latestRun
    ? await listScenariosForRun(detail.latestRun.id)
    : [];
  const allFindingRows: FindingView[] = detail.findingRows;
  const findingRows: FindingView[] = allFindingRows.filter(
    (finding: FindingView) => finding.status === "open",
  );
  const messageRows: MessageView[] = founderView
    ? detail.messageRows
    : detail.messageRows.filter((message: MessageView) => message.visibility === "shared");
  const attachmentRows: AttachmentView[] = founderView
    ? detail.attachmentRows
    : detail.attachmentRows.filter((attachment: AttachmentView) => attachment.visibility === "shared");
  const reportRows = founderView
    ? detail.reportRows
    : detail.reportRows.filter((report: { status: string }) => report.status === "published");
  const latestReport = reportRows[0];
  const jobRows: JobRunView[] = detail.jobRows;
  const openInvites =
    founderView ? await listOpenInvitesForEngagement(detail.engagement.id) : [];
  const inviteFlash = founderView ? await readEngagementFlashCookie(detail.engagement.id) : null;

  return (
    <div className="detail-grid">
      <OverviewSection engagement={detail.engagement} founderView={founderView} />
      <ScenarioSection
        founderView={founderView}
        engagementId={detail.engagement.id}
        runLabel={detail.latestRun?.label || null}
        scenarioRows={scenarioRows}
        attachmentRows={attachmentRows}
      />
      <FindingsSection findingRows={findingRows} attachmentRows={attachmentRows} />
      <ReportSection
        founderView={founderView}
        engagementId={detail.engagement.id}
        latestReport={latestReport}
      />
      <MessagesSection
        founderView={founderView}
        engagementId={detail.engagement.id}
        messageRows={messageRows}
      />
      <ArtifactsSection
        founderView={founderView}
        engagementId={detail.engagement.id}
        attachmentRows={attachmentRows}
        scenarioRows={scenarioRows}
        findingRows={allFindingRows}
        reportRows={reportRows}
      />
      {founderView ? <JobHistorySection jobRows={jobRows} /> : null}
      <CustomerAccessSection
        founderView={founderView}
        engagementId={detail.engagement.id}
        inviteFlash={inviteFlash}
        openInvites={openInvites}
      />
    </div>
  );
}
