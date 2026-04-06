import { sampleReportSnapshot, toMarkdown } from "@assurance/core";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function SampleReportPage() {
  return (
    <>
      <PageHeader
        label="Sample report"
        title="A redacted assurance packet designed for real buyer scrutiny."
        description="This sample uses redacted demo data to show how the product captures scope, scenario outcomes, and buyer-safe remediation language."
      />
      <section className="content-section">
        <div className="callout mb-lg">
          Demo data. This page is a redacted sample built from seeded example records, not a live customer packet.
        </div>
        <div className="layout-two">
          <div>
            <h3>Executive summary</h3>
            <p className="mt-sm">
              {sampleReportSnapshot.summary.executiveSummary}
            </p>
            <div className="metrics-row metrics-row-compact mt-lg">
              <div className="metric">
                <span className="metric-value">
                  {sampleReportSnapshot.summary.readinessScore}
                </span>
                <span className="metric-label">Readiness</span>
              </div>
              <div className="metric">
                <span className="metric-value">
                  {sampleReportSnapshot.provider}
                </span>
                <span className="metric-label">Provider</span>
              </div>
              <div className="metric">
                <span className="metric-value">
                  {sampleReportSnapshot.findings.length}
                </span>
                <span className="metric-label">Open findings</span>
              </div>
            </div>
          </div>
          <div>
            <h3>Open findings</h3>
            <ul className="clean-list mt-sm">
              {sampleReportSnapshot.findings.map((finding) => (
                <li key={finding.title}>
                  <strong>{finding.title}</strong>
                  <br />
                  <span className="body-sm">{finding.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="content-section">
        <h3>Markdown export preview</h3>
        <pre className="code-block-preview">
          {toMarkdown(sampleReportSnapshot)}
        </pre>
      </section>
    </>
  );
}
