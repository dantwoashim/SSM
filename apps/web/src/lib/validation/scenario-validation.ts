import { z } from "zod";
import {
  idPattern,
  makeValidationError,
  scenarioExecutionModeSchema,
  scenarioOutcomeSchema,
  scenarioProtocolSchema,
  stringValue,
} from "./common";

export function parseScenarioReviewForm(formData: FormData) {
  const schema = z.object({
    engagementId: z.string().regex(idPattern),
    scenarioRunId: z.string().regex(idPattern),
    outcome: scenarioOutcomeSchema,
    reviewerNotes: z.string().max(4000),
    customerVisibleSummary: z.string().max(2000),
    buyerSafeReportNote: z.string().max(2000),
  });

  const result = schema.safeParse({
    engagementId: stringValue(formData, "engagementId"),
    scenarioRunId: stringValue(formData, "scenarioRunId"),
    outcome: stringValue(formData, "outcome"),
    reviewerNotes: stringValue(formData, "reviewerNotes"),
    customerVisibleSummary: stringValue(formData, "customerVisibleSummary"),
    buyerSafeReportNote: stringValue(formData, "buyerSafeReportNote"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parseManualScenarioForm(formData: FormData) {
  const schema = z.object({
    engagementId: z.string().regex(idPattern),
    title: z.string().min(3).max(180),
    protocol: scenarioProtocolSchema,
    executionMode: scenarioExecutionModeSchema,
    reviewerNotes: z.string().max(4000),
    customerVisibleSummary: z.string().max(2000),
    buyerSafeReportNote: z.string().max(2000),
  });

  const result = schema.safeParse({
    engagementId: stringValue(formData, "engagementId"),
    title: stringValue(formData, "title"),
    protocol: stringValue(formData, "protocol"),
    executionMode: stringValue(formData, "executionMode") || "manual",
    reviewerNotes: stringValue(formData, "reviewerNotes"),
    customerVisibleSummary: stringValue(formData, "customerVisibleSummary"),
    buyerSafeReportNote: stringValue(formData, "buyerSafeReportNote"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}
