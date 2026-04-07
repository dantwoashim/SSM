import type { IdpProvider } from "@assurance/core";
import { z } from "zod";
import { isRealDateString } from "../format";
import {
  datePattern,
  idPattern,
  idpProviderSchema,
  makeValidationError,
  parseFeatureValues,
  stringValue,
} from "./common";

export function parseLeadForm(formData: FormData) {
  const schema = z.object({
    companyName: z.string().min(2).max(120),
    contactName: z.string().min(2).max(120),
    contactEmail: z.string().email().max(254),
    productUrl: z.string().url().max(2048),
    dealStage: z.string().min(2).max(120),
    targetCustomer: z.string().min(2).max(120),
    targetIdp: idpProviderSchema,
    authNotes: z.string().max(4000),
    stagingAccessMethod: z.string().min(2).max(200),
    timeline: z.string().min(2).max(200),
    deadline: z
      .string()
      .regex(datePattern, "Deadline must be a date.")
      .refine(isRealDateString, "Deadline must be a real calendar date."),
    website: z.string().max(0).optional().default(""),
  });

  const raw = {
    companyName: stringValue(formData, "companyName"),
    contactName: stringValue(formData, "contactName"),
    contactEmail: stringValue(formData, "contactEmail").toLowerCase(),
    productUrl: stringValue(formData, "productUrl"),
    dealStage: stringValue(formData, "dealStage"),
    targetCustomer: stringValue(formData, "targetCustomer"),
    targetIdp: stringValue(formData, "targetIdp") as IdpProvider,
    authNotes: stringValue(formData, "authNotes"),
    stagingAccessMethod: stringValue(formData, "stagingAccessMethod"),
    timeline: stringValue(formData, "timeline"),
    deadline: stringValue(formData, "deadline"),
    website: stringValue(formData, "website"),
  };

  const result = schema.safeParse(raw);

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return {
    ...result.data,
    requiredFlows: parseFeatureValues(formData, "requiredFlows"),
  };
}

export function parseCreateEngagementForm(formData: FormData) {
  const schema = z.object({
    title: z.string().min(3).max(180),
    companyName: z.string().min(2).max(120),
    productUrl: z.string().url().max(2048),
    targetCustomer: z.string().min(2).max(120),
    targetIdp: idpProviderSchema,
    deadline: z.union([
      z.literal(""),
      z
        .string()
        .regex(datePattern)
        .refine(isRealDateString, "Deadline must be a real calendar date."),
    ]),
  });

  const result = schema.safeParse({
    title: stringValue(formData, "title"),
    companyName: stringValue(formData, "companyName"),
    productUrl: stringValue(formData, "productUrl"),
    targetCustomer: stringValue(formData, "targetCustomer"),
    targetIdp: stringValue(formData, "targetIdp") as IdpProvider,
    deadline: stringValue(formData, "deadline"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return {
    ...result.data,
    claimedFeatures: parseFeatureValues(formData, "claimedFeatures"),
  };
}

export function parseJobActionForm(formData: FormData, field = "engagementId") {
  const value = stringValue(formData, field);
  const result = z.string().regex(idPattern, "Invalid engagement id.").safeParse(value);

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}
