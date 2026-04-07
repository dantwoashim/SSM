import { ReportSnapshot, Severity } from "./types";

const severityOrder: Record<Severity, number> = {
  "blocks-go-live": 4,
  "high-risk": 3,
  "needs-clarification": 2,
  "non-blocking": 1,
};

export function buildPublicationAssessment(snapshot: Pick<ReportSnapshot, "scenarios" | "findings">) {
  const totalScenarios = snapshot.scenarios.length;
  const pendingScenarios = snapshot.scenarios.filter((scenario) => scenario.outcome === "pending").length;
  const skippedScenarios = snapshot.scenarios.filter((scenario) => scenario.outcome === "skipped").length;
  const executedScenarios = snapshot.scenarios.filter(
    (scenario) => scenario.outcome === "passed" || scenario.outcome === "failed",
  ).length;
  const openFindings = snapshot.findings.length;
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (totalScenarios === 0) {
    blockingReasons.push("No scoped scenarios were executed for this report.");
  }

  if (pendingScenarios > 0) {
    blockingReasons.push("At least one required scenario is still pending.");
  }

  if (executedScenarios === 0) {
    blockingReasons.push("No scenarios were actually executed in the current cycle.");
  }

  if (totalScenarios > 0 && executedScenarios / totalScenarios < 0.7) {
    blockingReasons.push("Execution coverage is too low to publish a credible readiness report.");
  }

  if (skippedScenarios > 0) {
    warnings.push(`${skippedScenarios} scenario(s) were skipped and should be explicitly acknowledged.`);
  }

  if (openFindings > 0) {
    warnings.push(`${openFindings} open finding(s) remain in scope.`);
  }

  return {
    canPublish: blockingReasons.length === 0,
    requiresAcknowledgement: warnings.length > 0,
    blockingReasons,
    warnings,
  };
}

export function computeReadinessScore(snapshot: Pick<ReportSnapshot, "scenarios" | "findings">): number {
  const total = snapshot.scenarios.length;
  if (total === 0) {
    return 0;
  }

  const passed = snapshot.scenarios.filter((scenario) => scenario.outcome === "passed").length;
  const failed = snapshot.scenarios.filter((scenario) => scenario.outcome === "failed").length;
  const skipped = snapshot.scenarios.filter((scenario) => scenario.outcome === "skipped").length;
  const pending = snapshot.scenarios.filter((scenario) => scenario.outcome === "pending").length;
  const executed = passed + failed;
  const coverageComponent = (executed / total) * 55;
  const passComponent = (passed / total) * 45;
  const weightedFindingPenalty = snapshot.findings.reduce((totalPenalty, finding) => {
    return totalPenalty + severityOrder[finding.severity] * 6;
  }, 0);
  const executionPenalty = failed * 8 + skipped * 8 + pending * 20;

  return Math.max(0, Math.round(coverageComponent + passComponent - weightedFindingPenalty - executionPenalty));
}

export function formatExecutiveSummary(snapshot: ReportSnapshot): string {
  const publication = buildPublicationAssessment(snapshot);
  const blocking = snapshot.findings.filter((finding) => finding.severity === "blocks-go-live").length;
  const highRisk = snapshot.findings.filter((finding) => finding.severity === "high-risk").length;
  const passed = snapshot.scenarios.filter((scenario) => scenario.outcome === "passed").length;
  const manual = snapshot.scenarios.filter((scenario) => scenario.executionMode === "manual").length;
  const guided = snapshot.scenarios.filter((scenario) => scenario.executionMode === "guided").length;
  const executed = snapshot.scenarios.filter(
    (scenario) => scenario.outcome === "passed" || scenario.outcome === "failed",
  ).length;
  const skipped = snapshot.scenarios.filter((scenario) => scenario.outcome === "skipped").length;
  const pending = snapshot.scenarios.filter((scenario) => scenario.outcome === "pending").length;

  return [
    `${snapshot.companyName} was assessed for ${snapshot.targetCustomer} against ${snapshot.provider} enterprise identity rollout requirements.`,
    `${passed} of ${snapshot.scenarios.length} scoped scenarios passed, and ${executed} scenario(s) were fully executed in the current cycle.`,
    `Execution coverage in this cycle is reviewer-managed: ${manual} manual scenario(s) and ${guided} guided scenario(s).`,
    snapshot.summary.providerValidation.supportStatement,
    pending > 0 ? `${pending} scenario(s) remain pending.` : "No scoped scenarios remain pending.",
    skipped > 0 ? `${skipped} scenario(s) were skipped and are called out in the report scope.` : "No scoped scenarios were skipped.",
    blocking > 0
      ? `${blocking} blocking issue(s) remain before go-live.`
      : "No blocking issues were identified in the tested scope.",
    highRisk > 0 ? `${highRisk} additional high-risk issue(s) should be remediated.` : "No additional high-risk issues were identified.",
    publication.canPublish
      ? "Coverage is sufficient to publish the report with the stated caveats."
      : "Coverage is not yet sufficient to publish a credible readiness report.",
  ].join(" ");
}

export function toMarkdown(snapshot: ReportSnapshot): string {
  const findingLines = snapshot.findings
    .sort((left, right) => severityOrder[right.severity] - severityOrder[left.severity])
    .map(
      (finding) =>
        `- **${finding.title}** (${finding.severity}${finding.evidenceCount > 0 ? `, evidence: ${finding.evidenceCount}` : ""}): ${finding.customerSummary}\n  - Remediation: ${finding.remediation}\n  - Buyer-safe note: ${finding.buyerSafeNote}`,
    )
    .join("\n");

  const scenarioLines = snapshot.scenarios
    .map(
      (scenario) =>
        `- ${scenario.title} [${scenario.protocol}, ${scenario.executionMode}] - ${scenario.outcome}${scenario.evidenceCount > 0 ? ` (${scenario.evidenceCount} evidence)` : ""}${scenario.buyerSafeReportNote ? `: ${scenario.buyerSafeReportNote}` : ""}`,
    )
    .join("\n");

  const blockingReasons = snapshot.summary.publication.blockingReasons.length > 0
    ? snapshot.summary.publication.blockingReasons.map((reason) => `- ${reason}`).join("\n")
    : "- None";
  const warnings = snapshot.summary.publication.warnings.length > 0
    ? snapshot.summary.publication.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- None";
  const providerWarnings = snapshot.summary.providerValidation.warnings.length > 0
    ? snapshot.summary.providerValidation.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- None";

  return `# Assurance Report\n\n## Executive summary\n${snapshot.summary.executiveSummary}\n\n## Readiness coverage\n- Total scenarios: ${snapshot.summary.totalScenarios}\n- Executed: ${snapshot.summary.executedScenarios}\n- Passed: ${snapshot.summary.passedScenarios}\n- Failed: ${snapshot.summary.failedScenarios}\n- Skipped: ${snapshot.summary.skippedScenarios}\n- Pending: ${snapshot.summary.pendingScenarios}\n- Manual scenarios: ${snapshot.summary.manualScenarios}\n- Guided scenarios: ${snapshot.summary.guidedScenarios}\n- Assurance method: ${snapshot.summary.assuranceMethod}\n- Provider validation status: ${snapshot.summary.providerValidation.adapterStatus}\n- Readiness score: ${snapshot.summary.readinessScore}\n\n## Provider validation\n${snapshot.summary.providerValidation.supportStatement}\n\nWarnings:\n${providerWarnings}\n\n## Publication assessment\nCan publish: ${snapshot.summary.publication.canPublish ? "yes" : "no"}\n\nBlocking reasons:\n${blockingReasons}\n\nWarnings:\n${warnings}\n\n## Scope boundaries\n${snapshot.summary.scopeBoundaries}\n\n## Residual risk\n${snapshot.summary.residualRisk}\n\n## Scenario results\n${scenarioLines}\n\n## Findings\n${findingLines || "- No findings recorded."}\n`;
}
