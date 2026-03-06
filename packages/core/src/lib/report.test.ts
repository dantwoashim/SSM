import { describe, expect, it } from "vitest";
import { computeReadinessScore, formatExecutiveSummary, toMarkdown } from "./report";
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
  },
  scenarios: [
    {
      id: "sso-sp-initiated",
      title: "SP initiated login",
      protocol: "saml",
      outcome: "passed",
      reviewerNotes: "Correct tenant selected.",
    },
    {
      id: "group-role-mapping",
      title: "Group to role mapping",
      protocol: "scim",
      outcome: "failed",
      reviewerNotes: "Admin group mapped to viewer.",
    },
  ],
  findings: [
    {
      title: "Group role mapping drift",
      severity: "blocks-go-live",
      summary: "Admin group mapped to viewer.",
      remediation: "Fix role mapping normalization.",
      buyerSafeNote: "Role assignment is not yet reliable for the scoped groups.",
    },
  ],
};

describe("report helpers", () => {
  it("computes readiness score with scenario and finding penalties", () => {
    expect(computeReadinessScore(snapshot)).toBe(87);
  });

  it("formats executive summaries with rollout context", () => {
    const summary = formatExecutiveSummary(snapshot);

    expect(summary).toContain("Acme SaaS was assessed for Northwind Financial");
    expect(summary).toContain("1 scenarios passed");
    expect(summary).toContain("1 blocking issue(s) remain before go-live.");
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
    expect(markdown).toContain("## Scenario results");
    expect(markdown).toContain("Group role mapping drift");
  });
});
