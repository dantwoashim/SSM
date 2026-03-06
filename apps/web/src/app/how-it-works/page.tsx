import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title="Lead -> Qualification -> Engagement -> Report."
        description="The product is optimized for founder-led delivery first. Manual work is tracked, structured, and easy to automate later."
      />
      <div className="grid-two">
        <SectionPanel title="1. Intake and qualification">
          <ul className="list">
            <li>Capture deal stage, target customer, deadline, target IdP, and claimed identity support.</li>
            <li>Verify ACV potential, urgency, and staging access before converting to an engagement.</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="2. Default test plan">
          <ul className="list">
            <li>Generate a provider-aware scenario plan from the customer&apos;s required flows.</li>
            <li>Allow manual additions for buyer-specific edge cases.</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="3. Execution and triage">
          <ul className="list">
            <li>Track scenario outcomes, evidence, and reviewer notes.</li>
            <li>Promote failed scenarios into structured findings with remediation language.</li>
          </ul>
        </SectionPanel>
        <SectionPanel title="4. Assurance report and retest">
          <ul className="list">
            <li>Produce a reusable report snapshot and downloadable PDF.</li>
            <li>Re-run changed scenarios and preserve the customer-safe artifact trail.</li>
          </ul>
        </SectionPanel>
      </div>
    </>
  );
}
