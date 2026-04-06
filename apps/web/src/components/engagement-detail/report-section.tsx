import Link from "next/link";
import { publishReportAction } from "@/lib/actions/engagement-actions";
import { titleCase } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export function ReportSection({
  founderView,
  engagementId,
  latestReport,
}: {
  founderView: boolean;
  engagementId: string;
  latestReport:
    | {
        id: string;
        executiveSummary: string;
        readinessScore: number;
        version: number;
        status: string;
      }
    | undefined;
}) {
  return (
    <section className="detail-section">
      <h3>Latest report</h3>
      {latestReport ? (
        <>
          <p>{latestReport.executiveSummary}</p>
          <div className="metrics-row metrics-row-compact">
            <div className="metric">
              <span className="metric-value">{latestReport.readinessScore}</span>
              <span className="metric-label">Readiness</span>
            </div>
            <div className="metric">
              <span className="metric-value">v{latestReport.version}</span>
              <span className="metric-label">Version</span>
            </div>
            <div className="metric">
              <span className="metric-value status-label">{titleCase(latestReport.status)}</span>
              <span className="metric-label">Status</span>
            </div>
          </div>
          <div className="actions mt-lg">
            <Link className="button-secondary" href={`/api/reports/${latestReport.id}/pdf`}>
              Download PDF
            </Link>
            {founderView ? (
              <form action={publishReportAction}>
                <input type="hidden" name="reportId" value={latestReport.id} />
                <input type="hidden" name="engagementId" value={engagementId} />
                <SubmitButton pendingLabel="Publishing report...">Publish report</SubmitButton>
              </form>
            ) : null}
          </div>
        </>
      ) : (
        <div className="empty-state">
          {founderView ? "No report drafted yet." : "No published report is available yet."}
        </div>
      )}
    </section>
  );
}
