import {
  claimedFeatures,
  idpProviders,
  scenarioExecutionModes,
  scenarioProtocols,
  scenarioOutcomes,
  type ClaimedFeature,
  type IdpProvider,
} from "@assurance/core";
import { z } from "zod";
import { isRealDateString } from "./format";

const claimedFeatureSchema = z.enum(claimedFeatures);
const idpProviderSchema = z.enum(idpProviders);
const scenarioProtocolSchema = z.enum(scenarioProtocols);
const scenarioExecutionModeSchema = z.enum(scenarioExecutionModes);
const scenarioOutcomeSchema = z.enum(scenarioOutcomes);

const idPattern = /^[a-z]+_[0-9a-f-]+$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class ActionValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ActionValidationError";
  }
}

function stringValue(formData: FormData, field: string) {
  return formData.get(field)?.toString().trim() || "";
}

function optionalIdValue(formData: FormData, field: string) {
  const value = stringValue(formData, field);
  return value || null;
}

function safeRedirectTarget(value: string) {
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

function parseFeatureValues(formData: FormData, field: string) {
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

function makeValidationError(error: z.ZodError) {
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

export function parseLoginForm(formData: FormData) {
  const schema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
    redirectTo: z.string().max(2048).optional().default(""),
  });
  const result = schema.safeParse({
    email: stringValue(formData, "email").toLowerCase(),
    password: formData.get("password")?.toString() || "",
    redirectTo: stringValue(formData, "redirectTo"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return {
    email: result.data.email,
    password: result.data.password,
    redirectTo: safeRedirectTarget(result.data.redirectTo),
  };
}

export function parseAcceptInviteForm(formData: FormData) {
  const schema = z.object({
    token: z.string().min(20).max(128),
    password: z
      .string()
      .min(10)
      .max(128)
      .refine((value) => /[A-Z]/.test(value), "Password must include an uppercase letter.")
      .refine((value) => /[a-z]/.test(value), "Password must include a lowercase letter.")
      .refine((value) => /[0-9]/.test(value), "Password must include a number.")
      .optional(),
    mode: z.enum(["create-account", "claim-access"]).default("create-account"),
  });

  const result = schema.safeParse({
    token: stringValue(formData, "token"),
    password: stringValue(formData, "password") || undefined,
    mode: stringValue(formData, "mode") || "create-account",
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  if (result.data.mode === "create-account" && !result.data.password) {
    throw new ActionValidationError("Password is required.");
  }

  return result.data;
}

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

export function parseMessageForm(formData: FormData) {
  const visibilitySchema = z.enum(["shared", "internal"]);
  const schema = z.object({
    engagementId: z.string().regex(idPattern),
    visibility: visibilitySchema,
    body: z.string().min(3).max(4000),
  });
  const result = schema.safeParse({
    engagementId: stringValue(formData, "engagementId"),
    visibility: stringValue(formData, "visibility"),
    body: stringValue(formData, "body"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parsePublishReportForm(formData: FormData) {
  const schema = z.object({
    reportId: z.string().regex(idPattern),
    engagementId: z.string().regex(idPattern),
    acknowledgeWarnings: z.boolean(),
  });
  const result = schema.safeParse({
    reportId: stringValue(formData, "reportId"),
    engagementId: stringValue(formData, "engagementId"),
    acknowledgeWarnings: formData.get("acknowledgeWarnings")?.toString() === "1",
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parseInviteForm(formData: FormData) {
  const schema = z.object({
    engagementId: z.string().regex(idPattern),
    email: z.string().email().max(254),
    name: z.string().min(2).max(120),
  });
  const result = schema.safeParse({
    engagementId: stringValue(formData, "engagementId"),
    email: stringValue(formData, "email").toLowerCase(),
    name: stringValue(formData, "name"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parseAttachmentLinkage(formData: FormData) {
  const schema = z.object({
    scenarioRunId: z.string().regex(idPattern).nullable(),
    findingId: z.string().regex(idPattern).nullable(),
    reportId: z.string().regex(idPattern).nullable(),
  });

  const result = schema.safeParse({
    scenarioRunId: optionalIdValue(formData, "scenarioRunId"),
    findingId: optionalIdValue(formData, "findingId"),
    reportId: optionalIdValue(formData, "reportId"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export const allowedAttachmentContentTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
]);

export const maxAttachmentBytes = 10 * 1024 * 1024;

export function sanitizeAttachmentFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return sanitized || "artifact";
}

export function validateAttachmentUpload(file: File) {
  if (file.size <= 0) {
    throw new ActionValidationError("File is required.");
  }

  if (file.size > maxAttachmentBytes) {
    throw new ActionValidationError("Attachments must be 10 MB or smaller.");
  }

  if (!allowedAttachmentContentTypes.has(file.type || "")) {
    throw new ActionValidationError(
      "Unsupported file type. Upload PDF, image, text, CSV, JSON, or ZIP evidence only.",
    );
  }
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

function looksLikeText(bytes: Uint8Array) {
  const sample = bytes.slice(0, 512);

  for (const value of sample) {
    if (value === 9 || value === 10 || value === 13) {
      continue;
    }

    if (value < 32) {
      return false;
    }
  }

  return true;
}

export function validateAttachmentContent(bytes: Uint8Array, contentType: string, fileName: string) {
  const normalizedType = contentType || "application/octet-stream";

  if (normalizedType === "application/pdf" && !hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])) {
    throw new ActionValidationError("The uploaded PDF file does not match its declared file type.");
  }

  if (normalizedType === "image/png" && !hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    throw new ActionValidationError("The uploaded PNG file does not match its declared file type.");
  }

  if (normalizedType === "image/jpeg" && !hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    throw new ActionValidationError("The uploaded JPEG file does not match its declared file type.");
  }

  if (
    normalizedType === "image/webp"
    && !(hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP")
  ) {
    throw new ActionValidationError("The uploaded WEBP file does not match its declared file type.");
  }

  if (normalizedType === "application/zip" && !hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    throw new ActionValidationError("The uploaded ZIP file does not match its declared file type.");
  }

  if (
    (normalizedType === "text/plain" || normalizedType === "text/csv" || normalizedType === "application/json")
    && !looksLikeText(bytes)
  ) {
    throw new ActionValidationError(`The uploaded ${fileName} does not look like a valid text-based artifact.`);
  }
}

export function parseVisibility(formData: FormData) {
  const result = z.enum(["shared", "internal"]).safeParse(stringValue(formData, "visibility") || "shared");

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parseClaimedFeatures(value: string): ClaimedFeature[] {
  return parseFeatureCsv(value);
}
