import { PageHeader } from "@/components/page-header";
import { SectionPanel } from "@/components/section-panel";

const failures = [
  "IdP-initiated login resolves to the wrong tenant.",
  "SCIM deactivate requires a second sync cycle before access is removed.",
  "Group-to-role mapping under-assigns or over-assigns on first sync.",
  "Existing local users fork into duplicates during first SSO launch.",
  "JIT provisioning creates the account but misses the required default role.",
  "Certificate rollover is undocumented and stalls the customer IAM team.",
  "Group push succeeds structurally but lands in the wrong tenant scope.",
  "Login failures are opaque, so the customer cannot diagnose rollout issues.",
  "Tenant isolation assumptions fail when aliases or alternate domains are used.",
  "Audit events exist, but not in a form the buyer can actually trust or use.",
];

export default function Top10FailuresPage() {
  return (
    <>
      <PageHeader
        eyebrow="Lead magnet"
        title="Top 10 enterprise SSO and SCIM failures that delay go-live."
        description="Use this as a founder-led outbound asset, a sales-enablement handout, or a pre-call diagnostic checklist."
      />
      <SectionPanel title="Failure patterns that show up in live deal cycles">
        <ol className="list">
          {failures.map((failure) => (
            <li key={failure}>{failure}</li>
          ))}
        </ol>
      </SectionPanel>
    </>
  );
}
