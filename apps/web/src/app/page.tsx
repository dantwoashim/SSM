import Link from "next/link";
import { sampleReportSnapshot, scenarioLibrary } from "@assurance/core";

export const dynamic = "force-dynamic";

const workflow = [
  {
    title: "Intake and qualification",
    description:
      "Capture deal stage, target customer, deadline, target IdP, and claimed identity support. Verify ACV potential and staging access before converting.",
  },
  {
    title: "Provider-aware test plan",
    description:
      "Generate a scenario plan from the customer's required flows. Add manual items for buyer-specific edge cases.",
  },
  {
    title: "Execution and triage",
    description:
      "Track scenario outcomes, evidence, and reviewer notes. Promote failed scenarios into structured findings with remediation language.",
  },
  {
    title: "Assurance report",
    description:
      "Produce a buyer-shareable report snapshot and downloadable PDF. Re-run changed scenarios and preserve the customer-safe artifact trail.",
  },
];

const buyerQuestions = [
  "Does IdP-initiated login land in the correct tenant?",
  "What happens when SCIM deactivates a user mid-session?",
  "Can groups sync safely into application roles without over-assignment?",
  "What proof can a security reviewer actually forward internally?",
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <span className="page-label">Revenue-grade identity readiness</span>
        <h1>
          Close enterprise deals before SSO and SCIM edge cases stall the
          rollout.
        </h1>
        <p>
          Identity Go-Live Assurance helps B2B SaaS teams prove that SAML, SCIM,
          JIT, group mapping, and deprovisioning work for a named customer
          environment - before the buyer&apos;s IAM team finds the failure
          first.
        </p>
        <div className="actions">
          <Link className="button-primary" href="/intake">
            Request assurance
          </Link>
          <Link className="text-link" href="/resources/sample-report">
            View sample report {"->"}
          </Link>
        </div>
      </section>

      <div className="stats-strip">
        <div className="stat-item">
          <span className="stat-value">72h</span>
          <span className="stat-label">Fixed-scope turnaround</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">14</span>
          <span className="stat-label">Scenarios modeled</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">3</span>
          <span className="stat-label">Day-one IdPs supported</span>
        </div>
      </div>

      <section className="content-section">
        <div className="layout-two">
          <div>
            <div className="section-header">
              <h2>What buyers actually need answered</h2>
              <p>
                The output survives security review, sales engineering, and IAM
                scrutiny. These are the questions enterprise procurement asks.
              </p>
            </div>
            <ul className="clean-list">
              {buyerQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="section-header">
              <h2>How the workflow lands faster</h2>
              <p>
                Deal Rescue: one environment, one target customer, one report,
                one retest.
              </p>
            </div>
            <ol className="numbered-steps">
              {workflow.map((step) => (
                <li key={step.title} className="step-item">
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <span className="page-label">Sample output</span>
          <h2>A buyer-safe report that makes your claim believable</h2>
          <p>
            The artifact is the product. Engineering gets structured
            remediation; sales engineering gets a forwardable proof packet.
          </p>
          <p className="muted">
            The preview below is built from redacted demo data so visitors can inspect the structure without exposing a customer engagement.
          </p>
        </div>
        <div className="layout-two mt-xl">
          <div>
            <h3>{sampleReportSnapshot.engagementTitle}</h3>
            <p className="mt-sm">
              {sampleReportSnapshot.summary.executiveSummary}
            </p>
            <div className="metric-cluster">
              <div className="metric">
                <span className="metric-value">
                  {sampleReportSnapshot.summary.readinessScore}
                </span>
                <span className="metric-label">Readiness score</span>
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
            <h4 className="mb-md">Scenarios covered</h4>
            <div className="tag-row">
              {scenarioLibrary.slice(0, 8).map((s) => (
                <span key={s.id} className="tag">
                  {s.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="layout-three">
          <div>
            <h3>Executive summary</h3>
            <p className="mt-sm">
              Pass/fail risk in procurement-safe language with severity, scope,
              and residual risk.
            </p>
          </div>
          <div>
            <h3>Technical appendix</h3>
            <p className="mt-sm">
              Scenarios, evidence, reviewer notes, and remediation guidance
              without freeform chaos.
            </p>
          </div>
          <div>
            <h3>Retest-ready workflow</h3>
            <p className="mt-sm">
              Track which scenarios changed, which findings remain open, and
              which proof is safe to share.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
