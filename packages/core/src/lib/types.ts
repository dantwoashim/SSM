export const idpProviders = ["okta", "entra", "google-workspace"] as const;
export type IdpProvider = (typeof idpProviders)[number];

export const claimedFeatures = [
  "sp-initiated-sso",
  "idp-initiated-sso",
  "jit-provisioning",
  "scim-create",
  "scim-update",
  "scim-deactivate",
  "scim-reactivate",
  "group-push",
  "group-role-mapping",
  "duplicate-account-linking",
  "tenant-isolation",
  "certificate-rollover",
  "auditability",
] as const;
export type ClaimedFeature = (typeof claimedFeatures)[number];

export const scenarioProtocols = ["saml", "scim", "ops"] as const;
export type ScenarioProtocol = (typeof scenarioProtocols)[number];
export const scenarioExecutionModes = ["manual", "guided"] as const;
export type ScenarioExecutionMode = (typeof scenarioExecutionModes)[number];

export const severities = [
  "blocks-go-live",
  "high-risk",
  "needs-clarification",
  "non-blocking",
] as const;
export type Severity = (typeof severities)[number];

export const scenarioOutcomes = ["pending", "passed", "failed", "skipped"] as const;
export type ScenarioOutcome = (typeof scenarioOutcomes)[number];
export const engagementStatuses = [
  "lead-intake",
  "qualified",
  "in-progress",
  "report-drafting",
  "report-ready",
  "retest",
  "closed",
] as const;
export type EngagementStatus = (typeof engagementStatuses)[number];

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

export interface ProviderValidationSummary {
  adapterStatus: "manual-only" | "guided-checklist" | "unsupported";
  supportStatement: string;
  warnings: string[];
  unsupportedFeatures: ClaimedFeature[];
  validatedFeatures: ClaimedFeature[];
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
  assuranceMethod: string;
  providerValidation: ProviderValidationSummary;
  readinessScore: number;
  totalScenarios: number;
  executedScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  pendingScenarios: number;
  manualScenarios: number;
  guidedScenarios: number;
  publication: {
    canPublish: boolean;
    requiresAcknowledgement: boolean;
    blockingReasons: string[];
    warnings: string[];
  };
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
    executionMode: ScenarioExecutionMode;
    outcome: ScenarioOutcome;
    customerSummary: string;
    buyerSafeReportNote: string;
    evidenceCount: number;
  }>;
  findings: Array<{
    title: string;
    severity: Severity;
    customerSummary: string;
    remediation: string;
    buyerSafeNote: string;
    evidenceCount: number;
  }>;
}
