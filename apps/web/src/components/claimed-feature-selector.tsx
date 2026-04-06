import { claimedFeatures } from "@assurance/core";
import { titleCase } from "@/lib/format";

const labels: Record<(typeof claimedFeatures)[number], string> = {
  "sp-initiated-sso": "SP-initiated SSO",
  "idp-initiated-sso": "IdP-initiated SSO",
  "jit-provisioning": "JIT provisioning",
  "scim-create": "SCIM create",
  "scim-update": "SCIM update",
  "scim-deactivate": "SCIM deactivate",
  "scim-reactivate": "SCIM reactivate",
  "group-push": "Group push",
  "group-role-mapping": "Group-to-role mapping",
  "duplicate-account-linking": "Duplicate account linking",
  "tenant-isolation": "Tenant isolation",
  "certificate-rollover": "Certificate rollover",
  auditability: "Auditability",
};

export function ClaimedFeatureSelector({
  fieldName,
  legend,
  selected = [],
}: {
  fieldName: string;
  legend: string;
  selected?: string[];
}) {
  return (
    <fieldset className="feature-selector">
      <legend>{legend}</legend>
      <div className="feature-grid">
        {claimedFeatures.map((feature) => (
          <label className="feature-option" key={feature}>
            <input
              type="checkbox"
              name={fieldName}
              value={feature}
              defaultChecked={selected.includes(feature)}
            />
            <span>{labels[feature] || titleCase(feature)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
