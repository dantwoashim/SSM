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
    readinessScore: 0,
  },
  scenarios: [
    {
      id: "sso-sp-initiated",
      title: "SP-initiated SSO",
      protocol: "saml",
      outcome: "passed",
      reviewerNotes: "Tenant resolution and relay state validated against Northwind staging tenant.",
      evidenceCount: 2,
    },
    {
      id: "scim-deactivate-user",
      title: "SCIM deactivate user",
      protocol: "scim",
      outcome: "failed",
      reviewerNotes: "User lost app access only after a second sync cycle.",
      evidenceCount: 3,
    },
    {
      id: "group-role-mapping",
      title: "Group-to-role mapping",
      protocol: "ops",
      outcome: "failed",
      reviewerNotes: "Finance-Admin group mapped to viewer role during initial sync.",
      evidenceCount: 1,
    },
  ],
  findings: [
    {
      title: "SCIM deactivate delays access removal",
      severity: "blocks-go-live",
      summary: "Deactivation requires a second sync cycle before access is removed.",
      remediation: "Handle active=false immediately and revoke active sessions during deprovisioning.",
      buyerSafeNote: "Deprovisioning should terminate access predictably during customer security reviews.",
      evidenceCount: 3,
    },
    {
      title: "Group-to-role mapping under-assigns Finance-Admin",
      severity: "high-risk",
      summary: "Admin group assignments fall back to viewer on first sync.",
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
