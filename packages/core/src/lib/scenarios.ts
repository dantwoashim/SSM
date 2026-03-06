import {
  ClaimedFeature,
  FindingTemplate,
  IdpProvider,
  ScenarioDefinition,
  TestPlanScenario,
} from "./types";

export const scenarioLibrary: ScenarioDefinition[] = [
  {
    id: "sso-sp-initiated",
    title: "SP-initiated SSO",
    description: "Validate that users can launch from the SaaS app into the IdP and return with a valid assertion.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "blocks-go-live",
    protocol: "saml",
    executionMode: "guided",
    prerequisites: ["Staging tenant configured in IdP", "Known-good test user"],
    requiredFeatures: ["sp-initiated-sso"],
    evidenceExpectations: ["Login trace", "Returned assertion screenshot", "User landing state"],
    remediationTemplate: "Confirm ACS URL, audience URI, relay state handling, and tenant lookup paths.",
    buyerSafeLanguage: "SP-initiated sign-in should be verified before production launch to avoid first-use login failures."
  },
  {
    id: "sso-idp-initiated",
    title: "IdP-initiated SSO",
    description: "Validate direct launch from the IdP tile or app launcher into the right tenant.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "high-risk",
    protocol: "saml",
    executionMode: "guided",
    prerequisites: ["IdP tile configured", "Tenant lookup rules documented"],
    requiredFeatures: ["idp-initiated-sso"],
    evidenceExpectations: ["IdP launch screenshot", "Tenant resolution confirmation"],
    remediationTemplate: "Check unsolicited response support, issuer validation, and tenant resolution logic.",
    buyerSafeLanguage: "IdP-initiated login often fails on tenant resolution or relay-state assumptions."
  },
  {
    id: "jit-user-creation",
    title: "JIT user creation",
    description: "Confirm new users are provisioned during first sign-in with the correct tenant and baseline permissions.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "blocks-go-live",
    protocol: "saml",
    executionMode: "manual",
    prerequisites: ["New test identity not yet present in app"],
    requiredFeatures: ["jit-provisioning"],
    evidenceExpectations: ["New account creation record", "Assigned role evidence"],
    remediationTemplate: "Validate attribute mapping, default role logic, and account-linking safeguards.",
    buyerSafeLanguage: "JIT should be verified with a net-new user so rollout does not create access gaps on day one."
  },
  {
    id: "login-failure-path",
    title: "Login failure handling",
    description: "Ensure login failures are surfaced clearly and do not strand users in ambiguous states.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "needs-clarification",
    protocol: "ops",
    executionMode: "manual",
    prerequisites: ["Expired or intentionally misconfigured test identity"],
    requiredFeatures: ["sp-initiated-sso"],
    evidenceExpectations: ["Error screen", "Support or audit trail"],
    remediationTemplate: "Add deterministic error handling and support guidance for auth failures.",
    buyerSafeLanguage: "Even when auth fails, the user path should be diagnosable by the IAM team."
  },
  {
    id: "scim-create-user",
    title: "SCIM create user",
    description: "Validate user creation through SCIM with all required attributes mapped correctly.",
    providerCoverage: ["okta", "entra"],
    defaultSeverity: "blocks-go-live",
    protocol: "scim",
    executionMode: "guided",
    prerequisites: ["SCIM connector credentials", "Reference attribute mapping"],
    requiredFeatures: ["scim-create"],
    evidenceExpectations: ["Inbound request log", "Created user record", "Attribute mapping check"],
    remediationTemplate: "Review attribute schemas, required fields, and create-user idempotency.",
    buyerSafeLanguage: "SCIM create should be validated with realistic attribute payloads before customer rollout."
  },
  {
    id: "scim-update-user",
    title: "SCIM update user",
    description: "Ensure updates propagate without clobbering tenant or role assignments unexpectedly.",
    providerCoverage: ["okta", "entra"],
    defaultSeverity: "high-risk",
    protocol: "scim",
    executionMode: "guided",
    prerequisites: ["Existing provisioned user"],
    requiredFeatures: ["scim-update"],
    evidenceExpectations: ["Patch request log", "Updated attributes", "No role drift"],
    remediationTemplate: "Review PATCH handling, immutable identifiers, and partial update semantics.",
    buyerSafeLanguage: "Attribute updates should not produce unintended role or tenant drift."
  },
  {
    id: "scim-deactivate-user",
    title: "SCIM deactivate user",
    description: "Ensure deprovisioning removes access quickly without destructive data loss.",
    providerCoverage: ["okta", "entra"],
    defaultSeverity: "blocks-go-live",
    protocol: "scim",
    executionMode: "guided",
    prerequisites: ["Provisioned active user", "Expected deactivation behavior documented"],
    requiredFeatures: ["scim-deactivate"],
    evidenceExpectations: ["Deactivate request", "Account access blocked", "Retention state"],
    remediationTemplate: "Confirm active=false handling, session revocation, and tenant-specific retention logic.",
    buyerSafeLanguage: "Deprovisioning is a standard IAM control and should behave predictably for security reviewers."
  },
  {
    id: "scim-reactivate-user",
    title: "SCIM reactivate user",
    description: "Confirm reactivated users regain access with the correct entitlements.",
    providerCoverage: ["okta", "entra"],
    defaultSeverity: "high-risk",
    protocol: "scim",
    executionMode: "manual",
    prerequisites: ["Previously deactivated user"],
    requiredFeatures: ["scim-reactivate"],
    evidenceExpectations: ["Reactivation request", "Role restoration check"],
    remediationTemplate: "Review reactivation semantics, duplicate identity checks, and entitlement restore logic.",
    buyerSafeLanguage: "Reactivation should restore the intended access state without duplicate accounts."
  },
  {
    id: "group-push",
    title: "Group push",
    description: "Verify groups arrive from the IdP and are represented correctly in the target tenant.",
    providerCoverage: ["okta", "entra"],
    defaultSeverity: "high-risk",
    protocol: "scim",
    executionMode: "manual",
    prerequisites: ["Group available in IdP", "Expected app mapping documented"],
    requiredFeatures: ["group-push"],
    evidenceExpectations: ["Group object log", "Target group mapping"],
    remediationTemplate: "Review group object schema, sync timing, and tenant scoping.",
    buyerSafeLanguage: "Group sync should be predictable because customers often anchor authorization to it."
  },
  {
    id: "group-role-mapping",
    title: "Group-to-role mapping",
    description: "Verify groups assign the correct application roles and do not grant excess access.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "blocks-go-live",
    protocol: "ops",
    executionMode: "manual",
    prerequisites: ["Authorization model documented"],
    requiredFeatures: ["group-role-mapping"],
    evidenceExpectations: ["Role assignment before/after", "Least-privilege check"],
    remediationTemplate: "Check mapping rules, precedence, and default fallback behavior.",
    buyerSafeLanguage: "Role mapping should be verified to prevent over-permissioning or broken access at launch."
  },
  {
    id: "duplicate-account-linking",
    title: "Duplicate account linking",
    description: "Confirm existing local accounts link safely to the IdP identity and do not fork duplicates.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "high-risk",
    protocol: "ops",
    executionMode: "manual",
    prerequisites: ["Existing local account with matching or aliased email"],
    requiredFeatures: ["duplicate-account-linking"],
    evidenceExpectations: ["User record comparison", "Linking outcome"],
    remediationTemplate: "Review email normalization, immutable subject matching, and invite flow behavior.",
    buyerSafeLanguage: "Duplicate identities create both security and support risk during rollout."
  },
  {
    id: "tenant-isolation",
    title: "Tenant isolation",
    description: "Validate identities from one tenant cannot land in or affect another tenant.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "blocks-go-live",
    protocol: "ops",
    executionMode: "manual",
    prerequisites: ["At least two tenant contexts available"],
    requiredFeatures: ["tenant-isolation"],
    evidenceExpectations: ["Cross-tenant negative test", "Tenant resolution logs"],
    remediationTemplate: "Validate tenant selection, domain mapping, and session boundary logic.",
    buyerSafeLanguage: "Tenant isolation is a fundamental enterprise expectation and should be explicitly tested."
  },
  {
    id: "certificate-rollover",
    title: "Certificate and metadata rollover",
    description: "Check whether SAML metadata changes can be rotated without downtime.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "needs-clarification",
    protocol: "saml",
    executionMode: "manual",
    prerequisites: ["Metadata update path documented"],
    requiredFeatures: ["certificate-rollover"],
    evidenceExpectations: ["Rollover procedure", "Post-change login confirmation"],
    remediationTemplate: "Document certificate replacement, metadata refresh timing, and rollback path.",
    buyerSafeLanguage: "Rollover readiness reduces operational risk for long-lived enterprise deployments."
  },
  {
    id: "auditability",
    title: "Auditability",
    description: "Confirm auth and provisioning actions can be explained to the customer IAM team.",
    providerCoverage: ["okta", "entra", "google-workspace"],
    defaultSeverity: "non-blocking",
    protocol: "ops",
    executionMode: "manual",
    prerequisites: ["Audit/event logs accessible"],
    requiredFeatures: ["auditability"],
    evidenceExpectations: ["Event logs", "Supportable timestamps", "Relevant actor IDs"],
    remediationTemplate: "Add consistent auth event logging and request correlation IDs.",
    buyerSafeLanguage: "Auditability strengthens procurement confidence and speeds IAM troubleshooting."
  }
];

export function selectScenarios(
  provider: IdpProvider,
  features: ClaimedFeature[],
): TestPlanScenario[] {
  const featureSet = new Set(features);

  return scenarioLibrary
    .filter((scenario) => scenario.providerCoverage.includes(provider))
    .filter((scenario) =>
      scenario.requiredFeatures.every((feature) => featureSet.has(feature)),
    )
    .map((scenario) => ({
      scenarioId: scenario.id,
      title: scenario.title,
      executionMode: scenario.executionMode,
      protocol: scenario.protocol,
      defaultSeverity: scenario.defaultSeverity,
    }));
}

export function buildFindingTemplate(scenarioId: string): FindingTemplate | null {
  const scenario = scenarioLibrary.find((entry) => entry.id === scenarioId);

  if (!scenario) {
    return null;
  }

  return {
    title: `${scenario.title} requires remediation`,
    severity: scenario.defaultSeverity,
    customerImpact: scenario.buyerSafeLanguage,
    remediation: scenario.remediationTemplate,
    buyerSafeNote: scenario.buyerSafeLanguage,
  };
}
