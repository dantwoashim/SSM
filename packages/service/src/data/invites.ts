import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, runInTransaction } from "./client";
import { audit } from "./audit";
import { makeId, now } from "./helpers";
import { engagementMemberships, invites, users } from "./schema";
import { assertAppUrlConfigured, env } from "../env";
import { InviteAccountMismatchError, InviteRequiresSignInError } from "../errors";

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
  return runInTransaction(async (db) => {
    const token = randomBytes(24).toString("hex");
    const normalizedEmail = input.email.toLowerCase();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    const tokenHash = hashToken(token);
    const createdAt = now();
    const [existingOpenInvite] = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.email, normalizedEmail),
          eq(invites.engagementId, input.engagementId),
          isNull(invites.acceptedAt),
        ),
      )
      .limit(1);

    if (existingOpenInvite) {
      await db
        .update(invites)
        .set({
          name: input.name,
          role: input.role,
          tokenHash,
          expiresAt,
          createdBy: input.createdBy,
          createdAt,
        })
        .where(eq(invites.id, existingOpenInvite.id));
      await audit(input.createdBy, "reissued_invite", "invite", existingOpenInvite.id, {
        email: normalizedEmail,
        engagementId: input.engagementId,
      }, db);
      assertAppUrlConfigured();

      return {
        invite: {
          ...existingOpenInvite,
          name: input.name,
          role: input.role,
          tokenHash,
          expiresAt,
          createdBy: input.createdBy,
          createdAt,
        },
        inviteUrl: `${env.appUrl}/accept-invite/${token}`,
      };
    }

    const invite = {
      id: makeId("invite"),
      email: normalizedEmail,
      name: input.name,
      role: input.role,
      engagementId: input.engagementId,
      tokenHash,
      expiresAt,
      acceptedAt: null,
      createdBy: input.createdBy,
      createdAt,
    };

    await db.insert(invites).values(invite);
    await audit(input.createdBy, "created_invite", "invite", invite.id, {
      email: input.email,
      engagementId: input.engagementId,
    }, db);
    assertAppUrlConfigured();

    return {
      invite,
      inviteUrl: `${env.appUrl}/accept-invite/${token}`,
    };
  });
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

export async function getInviteAcceptanceState(input: {
  token: string;
  currentUserId?: string | null;
}) {
  const invite = await getInviteByToken(input.token);

  if (!invite) {
    return null;
  }

  const db = await getDb();
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);

  if (!existingUser) {
    return {
      invite,
      mode: "create-account" as const,
      existingUser: null,
    };
  }

  if (input.currentUserId && input.currentUserId === existingUser.id) {
    return {
      invite,
      mode: "claim-access" as const,
      existingUser,
    };
  }

  if (input.currentUserId && input.currentUserId !== existingUser.id) {
    return {
      invite,
      mode: "wrong-account" as const,
      existingUser,
    };
  }

  return {
    invite,
    mode: "sign-in" as const,
    existingUser,
  };
}

export async function acceptInvite(input: {
  token: string;
  password?: string | null;
  currentUserId?: string | null;
}) {
  const invite = await getInviteByToken(input.token);

  if (!invite) {
    throw new Error("Invite is invalid or expired.");
  }

  return runInTransaction(async (db) => {
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, invite.email))
      .limit(1);

    if (!user) {
      if (!input.password) {
        throw new Error("Password is required to create this account.");
      }

      user = {
        id: makeId("user"),
        email: invite.email,
        passwordHash: await bcrypt.hash(input.password, 10),
        name: invite.name,
        role: invite.role,
        sessionVersion: 1,
        createdAt: now(),
      };
      await db.insert(users).values(user);
    } else {
      if (!input.currentUserId) {
        throw new InviteRequiresSignInError(invite.email);
      }

      if (input.currentUserId !== user.id) {
        throw new InviteAccountMismatchError(invite.email);
      }
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
    }, db);

    return {
      user,
      engagementId: invite.engagementId,
    };
  });
}
