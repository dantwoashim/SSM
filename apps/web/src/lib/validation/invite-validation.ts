import { z } from "zod";
import { idPattern, makeValidationError, stringValue } from "./common";

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
