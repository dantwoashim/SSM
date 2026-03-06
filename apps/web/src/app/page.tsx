import Link from "next/link";
import { sampleReportSnapshot, scenarioLibrary } from "@assurance/core";
import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

const workflow = [
  "Lead intake in minutes, not weeks.",
  "Qualification against ACV, urgency, and target IAM scope.",
  "A prebuilt scenario plan for Okta, Entra, or Google Workspace.",
  "Structured findings, retest tracking, and a buyer-shareable assurance report.",
];

const buyerQuestions = [
  "Does IdP-initiated login land in the correct tenant?",
  "What happens when SCIM deactivates a user?",
  "Can groups sync safely into roles?",
  "What proof can security review actually forward around internally?",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-card hero-copy">
          <span className="eyebrow">Revenue-grade identity readiness</span>
          <h1>Close enterprise deals before SSO and SCIM edge cases stall the rollout.</h1>
          <p>
            Identity Go-Live Assurance helps B2B SaaS teams prove that SAML, SCIM,
            JIT, group mapping, and deprovisioning work for a named customer
            environment before the buyer&apos;s IAM team finds the failure first.
          </p>
          <div className="actions">
            <Link className="button-primary" href="/intake">
              Request Deal Rescue
            </Link>
            <Link className="button-secondary" href="/resources/sample-report">
              Review sample report
            </Link>
          </div>
          <div className="stats">
            <div className="stat">
              <strong>72h</strong>
              fixed-scope assurance report turnaround
            </div>
            <div className="stat">
              <strong>3</strong>
              day-one IdPs: Okta, Entra, Google Workspace
            </div>
            <div className="stat">
              <strong>14</strong>
              launch scenarios already modeled in the library
            </div>
          </div>
        </div>
        <div className="hero-card hero-preview">
          <div className="report-preview">
            <div>
              <div className="kicker">Sample Assurance Report</div>
              <h2>{sampleReportSnapshot.engagementTitle}</h2>
              <p>{sampleReportSnapshot.summary.executiveSummary}</p>
            </div>
            <div className="grid-two">
              <div>
                <div className="kicker">Readiness score</div>
                <h3>{sampleReportSnapshot.summary.readinessScore}/100</h3>
              </div>
              <div>
                <div className="kicker">Open findings</div>
                <h3>{sampleReportSnapshot.findings.length}</h3>
              </div>
            </div>
            <div className="pill-row">
              {scenarioLibrary.slice(0, 6).map((scenario) => (
                <span key={scenario.id} className="pill">
                  {scenario.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid-two">
        <SectionPanel
          title="What buyers actually need"
          description="This is not a generic auth implementation tool. The output is designed to survive security review, sales engineering, and IAM scrutiny."
        >
          <ul className="list">
            {buyerQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </SectionPanel>
        <SectionPanel
          title="How the workflow lands faster"
          description="The first offer is Deal Rescue: one environment, one target customer, one report, one retest."
        >
          <ul className="list">
            {workflow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionPanel>
      </div>

      <PageHeader
        eyebrow="Built for real procurement threads"
        title="A buyer-safe report that makes your claim believable."
        description="The artifact is the product. Engineering gets structured remediation; sales engineering gets a forwardable proof packet."
      />

      <div className="grid-three">
        <SectionPanel title="Executive summary">
          <p>Explain pass/fail risk in procurement-safe language with severity, scope, and residual risk.</p>
        </SectionPanel>
        <SectionPanel title="Technical appendix">
          <p>Capture scenarios, evidence, reviewer notes, and remediation guidance without freeform chaos.</p>
        </SectionPanel>
        <SectionPanel title="Retest-ready workflow">
          <p>Track which scenarios changed, which findings remain open, and which proof is safe to share.</p>
        </SectionPanel>
      </div>
    </>
  );
}
