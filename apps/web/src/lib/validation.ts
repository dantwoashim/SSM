import {
  claimedFeatures,
  idpProviders,
  scenarioOutcomes,
  type ClaimedFeature,
  type IdpProvider,
} from "@assurance/core";
import { z } from "zod";

const claimedFeatureSchema = z.enum(claimedFeatures);
const idpProviderSchema = z.enum(idpProviders);
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
  });
  const result = schema.safeParse({
    email: stringValue(formData, "email").toLowerCase(),
    password: formData.get("password")?.toString() || "",
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
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
      .refine((value) => /[0-9]/.test(value), "Password must include a number."),
  });

  const result = schema.safeParse({
    token: stringValue(formData, "token"),
    password: formData.get("password")?.toString() || "",
  });

  if (!result.success) {
    throw makeValidationError(result.error);
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
    deadline: z.string().regex(datePattern, "Deadline must be a date."),
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
    requiredFlows: parseFeatureCsv(stringValue(formData, "requiredFlows")),
  };
}

export function parseCreateEngagementForm(formData: FormData) {
  const schema = z.object({
    title: z.string().min(3).max(180),
    companyName: z.string().min(2).max(120),
    productUrl: z.string().url().max(2048),
    targetCustomer: z.string().min(2).max(120),
    targetIdp: idpProviderSchema,
    deadline: z.union([z.literal(""), z.string().regex(datePattern)]),
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
    claimedFeatures: parseFeatureCsv(stringValue(formData, "claimedFeatures")),
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
  });

  const result = schema.safeParse({
    engagementId: stringValue(formData, "engagementId"),
    scenarioRunId: stringValue(formData, "scenarioRunId"),
    outcome: stringValue(formData, "outcome"),
    reviewerNotes: stringValue(formData, "reviewerNotes"),
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
  });
  const result = schema.safeParse({
    reportId: stringValue(formData, "reportId"),
    engagementId: stringValue(formData, "engagementId"),
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
