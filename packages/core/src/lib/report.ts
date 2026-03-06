import { ReportSnapshot, Severity } from "./types";

const severityOrder: Record<Severity, number> = {
  "blocks-go-live": 0,
  "high-risk": 1,
  "needs-clarification": 2,
  "non-blocking": 3,
};

export function computeReadinessScore(snapshot: Pick<ReportSnapshot, "scenarios" | "findings">): number {
  const failed = snapshot.scenarios.filter((scenario) => scenario.outcome === "failed").length;
  const weightedFindingPenalty = snapshot.findings.reduce((total, finding) => {
    return total + (severityOrder[finding.severity] + 1) * 5;
  }, 0);

  return Math.max(0, 100 - failed * 8 - weightedFindingPenalty);
}

export function formatExecutiveSummary(snapshot: ReportSnapshot): string {
  const blocking = snapshot.findings.filter((finding) => finding.severity === "blocks-go-live").length;
  const highRisk = snapshot.findings.filter((finding) => finding.severity === "high-risk").length;
  const passed = snapshot.scenarios.filter((scenario) => scenario.outcome === "passed").length;

  return [
    `${snapshot.companyName} was assessed for ${snapshot.targetCustomer} against ${snapshot.provider} enterprise identity rollout requirements.`,
    `${passed} scenarios passed during the current test cycle.`,
    blocking > 0
      ? `${blocking} blocking issue(s) remain before go-live.`
      : "No blocking issues were identified in the tested scope.",
    highRisk > 0 ? `${highRisk} additional high-risk issue(s) should be remediated.` : "No additional high-risk issues were identified.",
  ].join(" ");
}

export function toMarkdown(snapshot: ReportSnapshot): string {
  const findingLines = snapshot.findings
    .sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
    .map(
      (finding) =>
        `- **${finding.title}** (${finding.severity}): ${finding.summary}\n  - Remediation: ${finding.remediation}\n  - Buyer-safe note: ${finding.buyerSafeNote}`,
    )
    .join("\n");

  const scenarioLines = snapshot.scenarios
    .map(
      (scenario) =>
        `- ${scenario.title} [${scenario.protocol}] - ${scenario.outcome}${scenario.reviewerNotes ? `: ${scenario.reviewerNotes}` : ""}`,
    )
    .join("\n");

  return `# Assurance Report\n\n## Executive summary\n${snapshot.summary.executiveSummary}\n\n## Scope boundaries\n${snapshot.summary.scopeBoundaries}\n\n## Residual risk\n${snapshot.summary.residualRisk}\n\n## Scenario results\n${scenarioLines}\n\n## Findings\n${findingLines || "- No findings recorded."}\n`;
}
