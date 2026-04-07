import { z } from "zod";
import { idPattern, makeValidationError, stringValue } from "./common";

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
