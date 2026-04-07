"use server";

import { revalidatePath } from "next/cache";
import { addMessage } from "@/lib/data";
import { parseMessageForm } from "@/lib/validation";
import { requireEngagementAccess } from "./shared";

export async function addMessageAction(formData: FormData) {
  const parsed = parseMessageForm(formData);
  const engagementId = parsed.engagementId;
  const session = await requireEngagementAccess(engagementId);
  const visibility = session.role === "founder" ? parsed.visibility : "shared";
  await addMessage({
    engagementId,
    authorName: session.name,
    body: parsed.body,
    visibility,
  });
  revalidatePath(`/app/engagements/${engagementId}`);
}
