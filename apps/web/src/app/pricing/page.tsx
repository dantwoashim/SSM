import { PageHeader } from "@/components/page-header";

export default function PricingPage() {
  return (
    <>
      <PageHeader
        label="Pricing"
        title="Service-led pricing that maps to blocked revenue."
        description="Start with fixed-scope Deal Rescue engagements, then convert repeat pain into Launch Sprint or annual assurance."
      />
      <div className="pricing-grid">
        <div className="pricing-tier featured">
          <h3>Deal Rescue</h3>
          <p className="tier-desc">
            Best for one live enterprise deal or pilot.
          </p>
          <div className="price">$4k - $7k</div>
          <ul className="bullet-list">
            <li>One environment and one primary IdP</li>
            <li>Default scenario plan plus founder triage</li>
            <li>One assurance report and one retest pass</li>
            <li>72-hour turnaround from complete intake</li>
          </ul>
        </div>
        <div className="pricing-tier">
          <h3>Launch Sprint</h3>
          <p className="tier-desc">
            For broader rollout hardening and remediation support.
          </p>
          <div className="price">$12k - $25k</div>
          <ul className="bullet-list">
            <li>Multiple cycles of validation and remediation guidance</li>
            <li>Shared implementation readout with engineering or customer IT</li>
            <li>Role mapping deep dive and release-gating rehearsal</li>
          </ul>
        </div>
        <div className="pricing-tier">
          <h3>Annual Assurance</h3>
          <p className="tier-desc">
            For repeatable release gating and enterprise readiness.
          </p>
          <div className="price">$30k - $80k / year</div>
          <ul className="bullet-list">
            <li>Quarterly regression checks</li>
            <li>Priority support for high-value deals</li>
            <li>Dedicated engagement lead</li>
          </ul>
        </div>
      </div>
    </>
  );
}
