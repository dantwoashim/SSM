import { ReportSnapshot } from "./types";
import { computeReadinessScore, formatExecutiveSummary } from "./report";

const baseSampleReportSnapshot: ReportSnapshot = {
  engagementTitle: "Acme <> Northwind Deal Rescue",
  companyName: "Acme SaaS",
  targetCustomer: "Northwind Financial",
  provider: "entra",
  generatedAt: "2026-03-06T00:00:00.000Z",
  summary: {
    executiveSummary: "",
    residualRisk: "Two role-mapping and certificate rollover questions remain before production cutover.",
    scopeBoundaries: "Validation covered staging environment, a single customer tenant, and founder-observed retest evidence only.",
    assuranceMethod:
      "This report is based on reviewer-managed scenario execution and collected evidence. The application packages the work, but the operator performs the tenant-specific validation.",
    providerValidation: {
      adapterStatus: "manual-only",
      supportStatement:
        "Current Entra coverage is reviewer-managed. The product preserves scope, evidence, and publication controls, but tenant validation is still operator-run.",
      warnings: [
        "The Entra label reflects scenario coverage and checklist validation, not live tenant introspection.",
      ],
      unsupportedFeatures: [],
      validatedFeatures: ["sp-initiated-sso", "scim-deactivate", "group-role-mapping"],
    },
    readinessScore: 0,
    totalScenarios: 3,
    executedScenarios: 3,
    passedScenarios: 1,
    failedScenarios: 2,
    skippedScenarios: 0,
    pendingScenarios: 0,
    manualScenarios: 1,
    guidedScenarios: 2,
    publication: {
      canPublish: true,
      requiresAcknowledgement: true,
      blockingReasons: [],
      warnings: [
        "2 open finding(s) remain in scope.",
      ],
    },
  },
  scenarios: [
    {
      id: "sso-sp-initiated",
      title: "SP-initiated SSO",
      protocol: "saml",
      executionMode: "guided",
      outcome: "passed",
      customerSummary: "Tenant resolution and relay-state handling behaved as expected in the staged tenant.",
      buyerSafeReportNote: "SP-initiated launch resolved to the intended tenant during the staged validation cycle.",
      evidenceCount: 2,
    },
    {
      id: "scim-deactivate-user",
      title: "SCIM deactivate user",
      protocol: "scim",
      executionMode: "guided",
      outcome: "failed",
      customerSummary: "The user remained active until a second sync cycle completed.",
      buyerSafeReportNote: "Deprovisioning did not remove access on the first sync cycle in the staged test.",
      evidenceCount: 3,
    },
    {
      id: "group-role-mapping",
      title: "Group-to-role mapping",
      protocol: "ops",
      executionMode: "manual",
      outcome: "failed",
      customerSummary: "The Finance-Admin group under-assigned access during the initial sync.",
      buyerSafeReportNote: "Group-to-role mapping did not produce the intended admin access in the staged rollout.",
      evidenceCount: 1,
    },
  ],
  findings: [
    {
      title: "SCIM deactivate delays access removal",
      severity: "blocks-go-live",
      customerSummary: "Deactivation requires a second sync cycle before access is removed.",
      remediation: "Handle active=false immediately and revoke active sessions during deprovisioning.",
      buyerSafeNote: "Deprovisioning should terminate access predictably during customer security reviews.",
      evidenceCount: 3,
    },
    {
      title: "Group-to-role mapping under-assigns Finance-Admin",
      severity: "high-risk",
      customerSummary: "Admin group assignments fall back to viewer on first sync.",
      remediation: "Review precedence rules and stale-role overwrite behavior in authorization sync.",
      buyerSafeNote: "Role mapping should be deterministic so the customer IAM team can trust access outcomes.",
      evidenceCount: 1,
    },
  ],
};

export const sampleReportSnapshot: ReportSnapshot = {
  ...baseSampleReportSnapshot,
  summary: {
    ...baseSampleReportSnapshot.summary,
    executiveSummary: formatExecutiveSummary(baseSampleReportSnapshot),
    readinessScore: computeReadinessScore(baseSampleReportSnapshot),
  },
};
