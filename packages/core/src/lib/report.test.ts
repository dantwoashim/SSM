import { describe, expect, it } from "vitest";
import { buildPublicationAssessment, computeReadinessScore, formatExecutiveSummary, toMarkdown } from "./report";
import type { ReportSnapshot } from "./types";

const snapshot: ReportSnapshot = {
  engagementTitle: "Acme <> Northwind Deal Rescue",
  companyName: "Acme SaaS",
  targetCustomer: "Northwind Financial",
  provider: "entra",
  generatedAt: "2026-03-06T00:00:00.000Z",
  summary: {
    executiveSummary: "",
    residualRisk: "One finding remains open in scope.",
    scopeBoundaries: "Staging tenant only.",
    readinessScore: 0,
    totalScenarios: 2,
    executedScenarios: 2,
    passedScenarios: 1,
    failedScenarios: 1,
    skippedScenarios: 0,
    pendingScenarios: 0,
    publication: {
      canPublish: true,
      requiresAcknowledgement: true,
      blockingReasons: [],
      warnings: ["1 open finding(s) remain in scope."],
    },
  },
  scenarios: [
    {
      id: "sso-sp-initiated",
      title: "SP initiated login",
      protocol: "saml",
      outcome: "passed",
      customerSummary: "The staged launch resolved to the correct tenant.",
      buyerSafeReportNote: "SP-initiated launch resolved to the expected tenant during validation.",
      evidenceCount: 1,
    },
    {
      id: "group-role-mapping",
      title: "Group to role mapping",
      protocol: "scim",
      outcome: "failed",
      customerSummary: "The mapped role did not match the intended admin assignment.",
      buyerSafeReportNote: "Group-to-role mapping did not produce the intended admin access during validation.",
      evidenceCount: 2,
    },
  ],
  findings: [
    {
      title: "Group role mapping drift",
      severity: "blocks-go-live",
      customerSummary: "Admin group mapped to viewer.",
      remediation: "Fix role mapping normalization.",
      buyerSafeNote: "Role assignment is not yet reliable for the scoped groups.",
      evidenceCount: 2,
    },
  ],
};

describe("report helpers", () => {
  it("computes readiness score with coverage and finding penalties", () => {
    expect(computeReadinessScore(snapshot)).toBe(46);
  });

  it("formats executive summaries with rollout context", () => {
    const summary = formatExecutiveSummary(snapshot);

    expect(summary).toContain("Acme SaaS was assessed for Northwind Financial");
    expect(summary).toContain("1 of 2 scoped scenarios passed");
    expect(summary).toContain("1 blocking issue(s) remain before go-live.");
  });

  it("blocks publication when coverage is pending or skipped too heavily", () => {
    const publication = buildPublicationAssessment({
      ...snapshot,
      scenarios: [
        {
          ...snapshot.scenarios[0],
          outcome: "pending",
        },
        {
          ...snapshot.scenarios[1],
          outcome: "skipped",
        },
      ],
    });

    expect(publication.canPublish).toBe(false);
    expect(publication.blockingReasons.join(" ")).toMatch(/pending|coverage/i);
  });

  it("renders markdown output with scenarios and findings", () => {
    const markdown = toMarkdown({
      ...snapshot,
      summary: {
        ...snapshot.summary,
        executiveSummary: formatExecutiveSummary(snapshot),
        readinessScore: computeReadinessScore(snapshot),
      },
    });

    expect(markdown).toContain("# Assurance Report");
    expect(markdown).toContain("## Publication assessment");
    expect(markdown).toContain("## Scenario results");
    expect(markdown).toContain("Group role mapping drift");
    expect(markdown).toContain("evidence: 2");
  });
});
