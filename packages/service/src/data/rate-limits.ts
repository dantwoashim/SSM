import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { makeId, now } from "./helpers";
import { requestLimits } from "./schema";

export async function enforceRateLimit(input: {
  route: string;
  bucketKey: string;
  limit: number;
  windowMs: number;
}) {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(requestLimits)
    .where(eq(requestLimits.bucketKey, input.bucketKey))
    .limit(1);
  const timestamp = now();

  if (!existing) {
    await db.insert(requestLimits).values({
      id: makeId("limit"),
      bucketKey: input.bucketKey,
      route: input.route,
      count: 1,
      windowStartedAt: timestamp,
      updatedAt: timestamp,
    });
    return;
  }

  const windowStarted = new Date(existing.windowStartedAt).getTime();
  const expired = Number.isNaN(windowStarted) || Date.now() - windowStarted >= input.windowMs;

  if (expired) {
    await db
      .update(requestLimits)
      .set({
        count: 1,
        route: input.route,
        windowStartedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(requestLimits.id, existing.id));
    return;
  }

  if (existing.count >= input.limit) {
    throw new Error("Too many requests. Please wait and try again.");
  }

  await db
    .update(requestLimits)
    .set({
      count: existing.count + 1,
      updatedAt: timestamp,
    })
    .where(eq(requestLimits.id, existing.id));
}
