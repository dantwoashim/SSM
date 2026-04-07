import {
  claimedFeatures,
  idpProviders,
  scenarioExecutionModes,
  scenarioOutcomes,
  scenarioProtocols,
} from "@assurance/core";
import { z } from "zod";

export const claimedFeatureSchema = z.enum(claimedFeatures);
export const idpProviderSchema = z.enum(idpProviders);
export const scenarioProtocolSchema = z.enum(scenarioProtocols);
export const scenarioExecutionModeSchema = z.enum(scenarioExecutionModes);
export const scenarioOutcomeSchema = z.enum(scenarioOutcomes);

export const idPattern = /^[a-z]+_[0-9a-f-]+$/i;
export const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ActionValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ActionValidationError";
  }
}

export function stringValue(formData: FormData, field: string) {
  return formData.get(field)?.toString().trim() || "";
}

export function optionalIdValue(formData: FormData, field: string) {
  const value = stringValue(formData, field);
  return value || null;
}

export function safeRedirectTarget(value: string) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function parseFeatureCsv(value: string) {
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const features = z.array(claimedFeatureSchema).min(1).safeParse(parts);

  if (!features.success) {
    throw makeValidationError(features.error);
  }

  return [...new Set(features.data)];
}

export function parseFeatureValues(formData: FormData, field: string) {
  const rawValues = formData
    .getAll(field)
    .map((item) => item?.toString().trim() || "")
    .filter(Boolean);

  if (rawValues.length > 0) {
    const parsed = z.array(claimedFeatureSchema).min(1).safeParse(rawValues);

    if (!parsed.success) {
      throw makeValidationError(parsed.error);
    }

    return [...new Set(parsed.data)];
  }

  return parseFeatureCsv(stringValue(formData, field));
}

export function makeValidationError(error: z.ZodError) {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: Record<string, string[]> = {};

  for (const [field, messages] of Object.entries(flattened)) {
    fieldErrors[field] = messages ?? [];
  }

  return new ActionValidationError("Validation failed.", fieldErrors);
}

export function validationMessage(error: unknown) {
  if (error instanceof ActionValidationError) {
    const firstFieldError = Object.values(error.fieldErrors).flat()[0];
    return firstFieldError || error.message;
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}
