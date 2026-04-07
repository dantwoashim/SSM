import { getDb } from "../client";
import { audit } from "../audit";
import { makeId, now } from "../helpers";
import { messages } from "../schema";

export async function addMessage(input: {
  engagementId: string;
  authorName: string;
  body: string;
  visibility: "shared" | "internal";
}) {
  const db = await getDb();
  const message = {
    id: makeId("message"),
    engagementId: input.engagementId,
    authorName: input.authorName,
    body: input.body,
    visibility: input.visibility,
    createdAt: now(),
  };
  await db.insert(messages).values(message);
  await audit(input.authorName, "added_message", "engagement", input.engagementId, {
    visibility: input.visibility,
  });
  return message;
}
