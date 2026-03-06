import { sampleReportSnapshot, toMarkdown } from "@assurance/core";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function SampleReportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sample report"
        title="A redacted assurance packet designed for real buyer scrutiny."
        description="This sample shows how the product captures scope, scenario outcomes, and buyer-safe remediation language."
      />
      <div className="grid-two">
        <SectionPanel title="Executive summary">
          <p>{sampleReportSnapshot.summary.executiveSummary}</p>
          <div className="pill-row">
            <span className="pill">Readiness {sampleReportSnapshot.summary.readinessScore}/100</span>
            <span className="pill">{sampleReportSnapshot.provider}</span>
            <span className="pill">{sampleReportSnapshot.findings.length} open findings</span>
          </div>
        </SectionPanel>
        <SectionPanel title="Open findings">
          <ul className="list">
            {sampleReportSnapshot.findings.map((finding) => (
              <li key={finding.title}>
                <strong>{finding.title}</strong>: {finding.summary}
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>
      <article className="panel">
        <h3>Markdown export preview</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-body)" }}>
          {toMarkdown(sampleReportSnapshot)}
        </pre>
      </article>
    </>
  );
}
