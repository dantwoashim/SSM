import { z } from "zod";
import {
  ActionValidationError,
  idPattern,
  makeValidationError,
  optionalIdValue,
  stringValue,
} from "./common";

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
]);

export const maxAttachmentBytes = 10 * 1024 * 1024;

export type AttachmentInspectionResult = {
  normalizedContentType: string;
  scanStatus: "clean" | "manual-review-required";
  scanSummary: string;
  trustLevel: "verified" | "restricted";
  retentionUntil: string;
};

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
      "Unsupported file type. Upload PDF, image, text, CSV, or JSON evidence only.",
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

function decodeTextSample(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.slice(0, 4096));
}

function isLikelyJson(text: string) {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function hasSuspiciousTextMarkers(text: string) {
  return /<script\b|powershell\s+-|cmd\.exe|\/bin\/sh|eval\(|new Function\(|MZ\x90/i.test(text);
}

function hasSpreadsheetFormulaRisk(text: string) {
  return text
    .split(/\r?\n/)
    .some((line) => /^[=+\-@]/.test(line.trimStart()));
}

function buildRetentionUntil() {
  return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
}

export function inspectAttachmentContent(bytes: Uint8Array, contentType: string, fileName: string): AttachmentInspectionResult {
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

  if (
    (normalizedType === "text/plain" || normalizedType === "text/csv" || normalizedType === "application/json")
    && !looksLikeText(bytes)
  ) {
    throw new ActionValidationError(`The uploaded ${fileName} does not look like a valid text-based artifact.`);
  }

  if (normalizedType === "application/json") {
    const text = decodeTextSample(bytes);
    if (!isLikelyJson(text)) {
      throw new ActionValidationError("The uploaded JSON file does not contain valid JSON.");
    }
  }

  let scanStatus: AttachmentInspectionResult["scanStatus"] = "clean";
  let trustLevel: AttachmentInspectionResult["trustLevel"] = "verified";
  const scanMessages = ["Content type and lightweight safety checks passed."];

  if (normalizedType === "text/plain" || normalizedType === "text/csv" || normalizedType === "application/json") {
    const text = decodeTextSample(bytes);

    if (hasSuspiciousTextMarkers(text)) {
      scanStatus = "manual-review-required";
      trustLevel = "restricted";
      scanMessages.push("The file contains executable or script-like markers and should be reviewed before sharing.");
    }

    if (normalizedType === "text/csv" && hasSpreadsheetFormulaRisk(text)) {
      scanStatus = "manual-review-required";
      trustLevel = "restricted";
      scanMessages.push("The CSV includes spreadsheet formula prefixes and should be reviewed before external distribution.");
    }
  }

  return {
    normalizedContentType: normalizedType,
    scanStatus,
    scanSummary: scanMessages.join(" "),
    trustLevel,
    retentionUntil: buildRetentionUntil(),
  };
}

export function validateAttachmentContent(bytes: Uint8Array, contentType: string, fileName: string) {
  inspectAttachmentContent(bytes, contentType, fileName);
}

export function parseVisibility(formData: FormData) {
  const result = z.enum(["shared", "internal"]).safeParse(stringValue(formData, "visibility") || "shared");

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}

export function parseDeleteAttachmentForm(formData: FormData) {
  const schema = z.object({
    attachmentId: z.string().regex(idPattern),
    engagementId: z.string().regex(idPattern),
    reason: z.string().min(3).max(240),
  });
  const result = schema.safeParse({
    attachmentId: stringValue(formData, "attachmentId"),
    engagementId: stringValue(formData, "engagementId"),
    reason: stringValue(formData, "reason"),
  });

  if (!result.success) {
    throw makeValidationError(result.error);
  }

  return result.data;
}
