import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Service-led pricing that maps to blocked revenue."
        description="Start with fixed-scope Deal Rescue engagements, then convert repeat pain into Launch Sprint or annual assurance."
      />
      <div className="grid-three">
        <SectionPanel title="Deal Rescue" description="Best for one live enterprise deal or pilot.">
          <p>
            <strong>$4k-$7k pilot pricing</strong>
          </p>
          <ul className="list">
            <li>One environment and one primary IdP</li>
            <li>Default scenario plan plus founder triage</li>
            <li>One assurance report and one retest pass</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="Launch Sprint" description="For broader rollout hardening and remediation support.">
          <p>
            <strong>$12k-$25k</strong>
          </p>
          <ul className="list">
            <li>Multiple cycles of validation and remediation guidance</li>
            <li>Shared implementation readout with engineering or customer IT</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="Annual Assurance" description="For repeatable release gating and enterprise readiness.">
          <p>
            <strong>$30k-$80k / year</strong>
          </p>
          <ul className="list">
            <li>Quarterly regression checks</li>
            <li>Priority support for high-value deals</li>
          </ul>
        </SectionPanel>
      </div>
    </>
  );
}
