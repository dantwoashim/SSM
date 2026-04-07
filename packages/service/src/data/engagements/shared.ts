import { buildFindingTemplate } from "@assurance/core";

export const manualScenarioPrefix = "manual:";

export function slugifyManualScenarioTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildManualScenarioId(protocol: string, title: string) {
  return `${manualScenarioPrefix}${protocol}:${slugifyManualScenarioTitle(title) || "custom-check"}`;
}

export function buildFindingKey(input: {
  scenarioId: string;
  protocol: string;
  title: string | null;
}) {
  if (input.scenarioId.startsWith(manualScenarioPrefix)) {
    return input.scenarioId;
  }

  const titleToken = slugifyManualScenarioTitle(input.title || input.scenarioId);
  return `${input.protocol}:${input.scenarioId}:${titleToken}`;
}

export function buildScenarioFindingTemplate(input: {
  scenarioId: string;
  title: string | null;
  protocol: string;
  reviewerNotes: string;
  customerVisibleSummary: string;
  buyerSafeReportNote: string;
}) {
  const template = buildFindingTemplate(input.scenarioId);

  if (template) {
    return template;
  }

  const scenarioTitle = input.title || input.scenarioId;
  return {
    title: `${scenarioTitle} requires remediation`,
    severity: "needs-clarification" as const,
    customerImpact:
      "A customer-specific identity scenario remains unresolved and should be reviewed before go-live.",
    remediation:
      "Reproduce the behavior, document the expected state, and assign a concrete remediation owner before rollout.",
    buyerSafeNote:
      input.buyerSafeReportNote
        || input.customerVisibleSummary
        || input.reviewerNotes
        || "A manually scoped rollout scenario remains unresolved and should be reviewed before launch.",
  };
}
