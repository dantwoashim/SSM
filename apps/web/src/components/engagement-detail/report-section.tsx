"use client";

import Link from "next/link";
import { useActionState } from "react";
import { publishReportStateAction } from "@/lib/actions/engagement-actions";
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
        reportJson: {
          summary: {
            assuranceMethod: string;
            totalScenarios: number;
            executedScenarios: number;
            manualScenarios: number;
            guidedScenarios: number;
            publication: {
              canPublish: boolean;
              requiresAcknowledgement: boolean;
              blockingReasons: string[];
              warnings: string[];
            };
          };
        };
      }
    | undefined;
}) {
  const [publishState, publishAction] = useActionState(publishReportStateAction, {
    error: "",
    notice: "",
  });

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
            <div className="metric">
              <span className="metric-value">
                {latestReport.reportJson.summary.executedScenarios}/{latestReport.reportJson.summary.totalScenarios}
              </span>
              <span className="metric-label">Coverage</span>
            </div>
            <div className="metric">
              <span className="metric-value">
                {latestReport.reportJson.summary.manualScenarios}/{latestReport.reportJson.summary.guidedScenarios}
              </span>
              <span className="metric-label">Manual / guided</span>
            </div>
          </div>
          <div className="callout mt-md">
            <strong>Assurance method</strong>
            <p className="mt-sm">{latestReport.reportJson.summary.assuranceMethod}</p>
          </div>
          {latestReport.reportJson.summary.publication.blockingReasons.length > 0 ? (
            <div className="callout mt-md">
              <strong>Publication blocked</strong>
              <ul>
                {latestReport.reportJson.summary.publication.blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {latestReport.reportJson.summary.publication.warnings.length > 0 ? (
            <div className="callout mt-md">
              <strong>Publication warnings</strong>
              <ul>
                {latestReport.reportJson.summary.publication.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="actions mt-lg">
            <Link className="button-secondary" href={`/api/reports/${latestReport.id}/pdf`}>
              Download PDF
            </Link>
            {founderView ? (
              <form action={publishAction}>
                <input type="hidden" name="reportId" value={latestReport.id} />
                <input type="hidden" name="engagementId" value={engagementId} />
                {latestReport.reportJson.summary.publication.requiresAcknowledgement ? (
                  <label className="checkbox-row">
                    <input type="checkbox" name="acknowledgeWarnings" value="1" />
                    <span>Acknowledge the remaining gaps before publishing.</span>
                  </label>
                ) : null}
                <SubmitButton pendingLabel="Publishing report...">Publish report</SubmitButton>
              </form>
            ) : null}
          </div>
          {publishState.error ? <p className="error-message mt-md">{publishState.error}</p> : null}
          {!publishState.error && publishState.notice ? <p className="muted mt-md">{publishState.notice}</p> : null}
        </>
      ) : (
        <div className="empty-state">
          {founderView ? "No report drafted yet." : "No published report is available yet."}
        </div>
      )}
    </section>
  );
}
