import {
  claimedFeatures,
  scenarioLibrary,
  type ClaimedFeature,
  type IdpProvider,
  type ProviderValidationSummary,
} from "@assurance/core";

type EngagementLike = {
  targetIdp: IdpProvider;
  claimedFeatures: ClaimedFeature[];
  environment?: {
    url?: string | null;
    name?: string | null;
  } | null;
  idpProfile?: {
    provider?: IdpProvider | null;
    profileName?: string | null;
    notes?: string | null;
  } | null;
};

function hasFeature(features: ClaimedFeature[], target: ClaimedFeature) {
  return features.includes(target);
}

function hasSubstantiveNotes(value?: string | null) {
  return !!value && value.trim().length >= 20;
}

function providerSupportStatement(provider: IdpProvider, adapterStatus: ProviderValidationSummary["adapterStatus"]) {
  if (adapterStatus === "unsupported") {
    return `Current ${provider} coverage is incomplete for the requested feature set. The system can still track a scoped review, but this engagement should not be presented as fully covered without manual caveats.`;
  }

  if (adapterStatus === "guided-checklist") {
    return `Current ${provider} coverage is checklist-guided. The system validates engagement inputs, scenario scope, and publication controls, but tenant execution is still reviewer-managed.`;
  }

  return `Current ${provider} coverage is reviewer-managed. The system preserves scope, evidence, and publication controls, but live tenant validation is still operator-run.`;
}

export function buildProviderValidationSummary(engagement: EngagementLike): ProviderValidationSummary {
  const claimed = engagement.claimedFeatures.filter((feature) => claimedFeatures.includes(feature));
  const supportedScenarioFeatures = new Set(
    scenarioLibrary
      .filter((scenario) => scenario.providerCoverage.includes(engagement.targetIdp))
      .flatMap((scenario) => scenario.requiredFeatures),
  );
  const unsupportedFeatures = claimed.filter((feature) => !supportedScenarioFeatures.has(feature));
  const validatedFeatures = claimed.filter((feature) => supportedScenarioFeatures.has(feature));
  const selectedScenarios = scenarioLibrary.filter(
    (scenario) =>
      scenario.providerCoverage.includes(engagement.targetIdp)
      && scenario.requiredFeatures.every((feature) => claimed.includes(feature)),
  );
  const warnings: string[] = [
    `${engagement.targetIdp} support currently reflects scoped scenario coverage and validation discipline, not live tenant introspection.`,
  ];

  if (!engagement.environment?.url) {
    warnings.push("No environment URL is recorded for this engagement, so provider configuration cannot be cross-checked against the delivery target.");
  }

  if (!engagement.idpProfile?.profileName) {
    warnings.push("No named IdP profile is recorded for this engagement.");
  }

  if (
    (hasFeature(claimed, "scim-create")
      || hasFeature(claimed, "scim-update")
      || hasFeature(claimed, "scim-deactivate")
      || hasFeature(claimed, "scim-reactivate")
      || hasFeature(claimed, "group-push"))
    && !hasSubstantiveNotes(engagement.idpProfile?.notes)
  ) {
    warnings.push("SCIM-oriented coverage is claimed, but the IdP profile notes do not yet capture connector details, credential handling, or the expected provisioning path.");
  }

  if (hasFeature(claimed, "idp-initiated-sso") && !hasSubstantiveNotes(engagement.idpProfile?.notes)) {
    warnings.push("IdP-initiated coverage is claimed, but there is no recorded note about tile configuration, landing behavior, or tenant routing assumptions.");
  }

  if (hasFeature(claimed, "tenant-isolation") && !hasSubstantiveNotes(engagement.idpProfile?.notes)) {
    warnings.push("Tenant-isolation coverage should carry an explicit note describing how tenant routing is expected to work during the validation cycle.");
  }

  let adapterStatus: ProviderValidationSummary["adapterStatus"] = "manual-only";
  if (unsupportedFeatures.length > 0) {
    adapterStatus = "unsupported";
    warnings.push(
      `The current ${engagement.targetIdp} scenario library does not cover: ${unsupportedFeatures.join(", ")}.`,
    );
  } else if (selectedScenarios.length > 0 && selectedScenarios.every((scenario) => scenario.executionMode === "guided")) {
    adapterStatus = "guided-checklist";
  }

  return {
    adapterStatus,
    supportStatement: providerSupportStatement(engagement.targetIdp, adapterStatus),
    warnings,
    unsupportedFeatures,
    validatedFeatures,
  };
}
