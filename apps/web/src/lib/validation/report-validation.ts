import { z } from "zod";
import { idPattern, makeValidationError, stringValue } from "./common";

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
