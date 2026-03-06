import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

const controls = [
  "Invite-only portal access with signed sessions.",
  "Local disk storage by default, with S3-compatible signed URL support for production.",
  "Artifact visibility controls so internal-only evidence stays founder-scoped.",
  "Artifact access logs and audit events for engagement creation, invite delivery, and report publication.",
  "Documented retention, deletion, backup, and incident-response runbooks.",
  "Optional transactional email for lead and invite response time without exposing open sign-up.",
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Security"
        title="Security-ready operations before formal compliance packaging."
        description="The launch baseline emphasizes least privilege, explicit retention, and customer-safe handling of evidence artifacts."
      />
      <div className="grid-two">
        <SectionPanel title="Operational baseline">
          <ul className="list">
            {controls.map((control) => (
              <li key={control}>{control}</li>
            ))}
          </ul>
        </SectionPanel>
        <SectionPanel title="Launch stance">
          <p>
            This product does not claim formal certification or attestation. It produces
            assurance reports and maintains security-ready operating controls while SOC 2
            preparation is deferred until initial revenue.
          </p>
        </SectionPanel>
      </div>
    </>
  );
}
