export type IdpProvider = "okta" | "entra" | "google-workspace";

export type ClaimedFeature =
  | "sp-initiated-sso"
  | "idp-initiated-sso"
  | "jit-provisioning"
  | "scim-create"
  | "scim-update"
  | "scim-deactivate"
  | "scim-reactivate"
  | "group-push"
  | "group-role-mapping"
  | "duplicate-account-linking"
  | "tenant-isolation"
  | "certificate-rollover"
  | "auditability";

export type ScenarioProtocol = "saml" | "oidc" | "scim" | "ops";
export type ScenarioExecutionMode = "manual" | "guided" | "automated";

export type Severity =
  | "blocks-go-live"
  | "high-risk"
  | "needs-clarification"
  | "non-blocking";

export type ScenarioOutcome = "pending" | "passed" | "failed" | "skipped";
export type EngagementStatus =
  | "lead-intake"
  | "qualified"
  | "in-progress"
  | "report-drafting"
  | "report-ready"
  | "retest"
  | "closed";

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  providerCoverage: IdpProvider[];
  defaultSeverity: Severity;
  protocol: ScenarioProtocol;
  executionMode: ScenarioExecutionMode;
  prerequisites: string[];
  requiredFeatures: ClaimedFeature[];
  evidenceExpectations: string[];
  remediationTemplate: string;
  buyerSafeLanguage: string;
}

export interface IntakePayload {
  companyName: string;
  contactName: string;
  contactEmail: string;
  productUrl: string;
  dealStage: string;
  targetCustomer: string;
  targetIdp: IdpProvider;
  requiredFlows: ClaimedFeature[];
  authNotes: string;
  stagingAccessMethod: string;
  timeline: string;
  deadline: string;
}

export interface QualificationChecklist {
  acvPotential: string;
  urgency: string;
  namedDeadline: string;
  existingSupport: string;
  stagingAccessConfirmed: boolean;
}

export interface EnvironmentProfile {
  name: string;
  url: string;
  stage: "staging" | "preview" | "demo";
}

export interface IdpProfile {
  provider: IdpProvider;
  profileName: string;
  notes: string;
}

export interface TestPlanScenario {
  scenarioId: string;
  title: string;
  executionMode: ScenarioExecutionMode;
  protocol: ScenarioProtocol;
  defaultSeverity: Severity;
}

export interface FindingTemplate {
  title: string;
  severity: Severity;
  customerImpact: string;
  remediation: string;
  buyerSafeNote: string;
}

export interface ReportSummary {
  executiveSummary: string;
  residualRisk: string;
  scopeBoundaries: string;
  readinessScore: number;
}

export interface ReportSnapshot {
  engagementTitle: string;
  companyName: string;
  targetCustomer: string;
  provider: IdpProvider;
  generatedAt: string;
  summary: ReportSummary;
  scenarios: Array<{
    id: string;
    title: string;
    protocol: ScenarioProtocol;
    outcome: ScenarioOutcome;
    reviewerNotes: string;
  }>;
  findings: Array<{
    title: string;
    severity: Severity;
    summary: string;
    remediation: string;
    buyerSafeNote: string;
  }>;
}
