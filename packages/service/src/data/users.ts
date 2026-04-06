import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { makeId, now } from "./helpers";
import { users } from "./schema";
import { audit } from "./audit";
import { assertFounderBootstrapConfigured, env, isLocalProdMode } from "../env";

export async function ensureFounderUser() {
  assertFounderBootstrapConfigured();
  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.role, "founder")).limit(1);

  if (existing) {
    if (isLocalProdMode()) {
      const passwordMatches = await bcrypt.compare(env.founderPassword, existing.passwordHash);
      const shouldSync =
        existing.email !== env.founderEmail ||
        existing.name !== env.founderName ||
        !passwordMatches;

      if (!shouldSync) {
        return existing;
      }

      const passwordHash = await bcrypt.hash(env.founderPassword, 10);
      const nextSessionVersion = existing.sessionVersion + 1;
      await db
        .update(users)
        .set({
          email: env.founderEmail,
          passwordHash,
          name: env.founderName,
          sessionVersion: nextSessionVersion,
        })
        .where(eq(users.id, existing.id));
      await audit(env.founderName, "synced_founder_user", "user", existing.id, {
        email: env.founderEmail,
        sessionVersion: nextSessionVersion,
      });

      return {
        ...existing,
        email: env.founderEmail,
        passwordHash,
        name: env.founderName,
        sessionVersion: nextSessionVersion,
      };
    }

    return existing;
  }

  const founder = {
    id: makeId("user"),
    email: env.founderEmail,
    passwordHash: await bcrypt.hash(env.founderPassword, 10),
    name: env.founderName,
    role: "founder",
    sessionVersion: 1,
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}
