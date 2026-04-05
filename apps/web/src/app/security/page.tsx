import { PageHeader } from "@/components/page-header";

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
        label="Security"
        title="Security-ready operations before formal compliance packaging."
        description="The launch baseline emphasizes least privilege, explicit retention, and customer-safe handling of evidence artifacts."
      />
      <section className="content-section">
        <div className="layout-two">
          <div>
            <h3>Operational baseline</h3>
            <ul className="clean-list mt-md">
              {controls.map((control) => (
                <li key={control}>{control}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Compliance position</h3>
            <p className="mt-md">
              This product does not claim formal certification or attestation.
              It produces assurance reports and maintains security-ready
              operating controls while SOC 2 preparation is deferred until
              initial revenue.
            </p>
            <p className="mt-md">
              We believe in earning trust through transparent operations, not
              through premature compliance theater.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
