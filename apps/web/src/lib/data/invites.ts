import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import { engagementMemberships, invites, users } from "./schema";
import { assertAppUrlConfigured, env } from "../env";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(input: {
  email: string;
  name: string;
  role: "customer";
  engagementId: string;
  createdBy: string;
}) {
  const db = await getDb();
  const token = randomBytes(24).toString("hex");
  const invite = {
    id: makeId("invite"),
    email: input.email.toLowerCase(),
    name: input.name,
    role: input.role,
    engagementId: input.engagementId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    acceptedAt: null,
    createdBy: input.createdBy,
    createdAt: now(),
  };

  await db.insert(invites).values(invite);
  await audit(input.createdBy, "created_invite", "invite", invite.id, {
    email: input.email,
    engagementId: input.engagementId,
  });
  assertAppUrlConfigured();

  return {
    invite,
    inviteUrl: `${env.appUrl}/accept-invite/${token}`,
  };
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  const tokenHash = hashToken(token);
  const [invite] = await db
    .select()
    .from(invites)
    .where(eq(invites.tokenHash, tokenHash))
    .limit(1);

  if (!invite) {
    return null;
  }

  if (invite.acceptedAt) {
    return null;
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return invite;
}

export async function acceptInvite(input: {
  token: string;
  password: string;
}) {
  const invite = await getInviteByToken(input.token);

  if (!invite) {
    throw new Error("Invite is invalid or expired.");
  }

  const db = await getDb();
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);

  if (!user) {
    user = {
      id: makeId("user"),
      email: invite.email,
      passwordHash: await bcrypt.hash(input.password, 10),
      name: invite.name,
      role: invite.role,
      createdAt: now(),
    };
    await db.insert(users).values(user);
  } else {
    await db
      .update(users)
      .set({
        passwordHash: await bcrypt.hash(input.password, 10),
        role: invite.role,
      })
      .where(eq(users.id, user.id));
  }

  const [existingMembership] = await db
    .select()
    .from(engagementMemberships)
    .where(
      and(
        eq(engagementMemberships.engagementId, invite.engagementId || ""),
        eq(engagementMemberships.userId, user.id),
      ),
    )
    .limit(1);

  if (!existingMembership && invite.engagementId) {
    await db.insert(engagementMemberships).values({
      id: makeId("membership"),
      engagementId: invite.engagementId,
      userId: user.id,
      role: "viewer",
      createdAt: now(),
    });
  }

  await db
    .update(invites)
    .set({
      acceptedAt: now(),
    })
    .where(eq(invites.id, invite.id));

  await audit(invite.name, "accepted_invite", "invite", invite.id, {
    engagementId: invite.engagementId,
    email: invite.email,
  });

  return {
    user,
    engagementId: invite.engagementId,
  };
}
