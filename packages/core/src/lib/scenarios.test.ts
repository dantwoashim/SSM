import { describe, expect, it } from "vitest";
import { computeReadinessScore, formatExecutiveSummary } from "./report";
import { sampleReportSnapshot } from "./sample-data";
import { selectScenarios } from "./scenarios";

describe("selectScenarios", () => {
  it("filters scenarios by provider and required features", () => {
    const scenarios = selectScenarios("entra", [
      "sp-initiated-sso",
      "scim-create",
      "scim-deactivate",
    ]);

    expect(scenarios.map((scenario) => scenario.scenarioId)).toEqual([
      "sso-sp-initiated",
      "login-failure-path",
      "scim-create-user",
      "scim-deactivate-user",
    ]);
  });
});

describe("report helpers", () => {
  it("builds a stable summary and readiness score", () => {
    expect(formatExecutiveSummary(sampleReportSnapshot)).toContain("blocking issue");
    expect(computeReadinessScore(sampleReportSnapshot)).toBeGreaterThanOrEqual(0);
  });
});
