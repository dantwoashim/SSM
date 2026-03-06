import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { makeId, now } from "./helpers";
import { users } from "./schema";
import { audit } from "./audit";
import { assertFounderBootstrapConfigured, env } from "../env";

export async function ensureFounderUser() {
  assertFounderBootstrapConfigured();
  const db = await getDb();
  const [existing] = await db.select().from(users).limit(1);

  if (existing) {
    return existing;
  }

  const founder = {
    id: makeId("user"),
    email: env.founderEmail,
    passwordHash: await bcrypt.hash(env.founderPassword, 10),
    name: env.founderName,
    role: "founder",
    createdAt: now(),
  };

  await db.insert(users).values(founder);
  await audit(founder.name, "seeded_founder_user", "user", founder.id, {
    email: founder.email,
  });
  return founder;
}

export async function authenticateUser(email: string, password: string) {
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  return matches ? user : null;
}
