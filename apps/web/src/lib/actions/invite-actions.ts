"use server";

import { redirect } from "next/navigation";
import { getCurrentSession, issueSessionCookie } from "@/lib/session";
import { acceptInvite } from "@/lib/data";
import { assertSameOriginRequest, getRequestIp } from "@/lib/request-context";
import { enforceRateLimit } from "@/lib/data";
import { parseAcceptInviteForm } from "@/lib/validation";

export async function acceptInviteAction(formData: FormData) {
  await assertSameOriginRequest();
  const ip = await getRequestIp();
  await enforceRateLimit({
    route: "accept-invite",
    bucketKey: `invite:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  const parsed = parseAcceptInviteForm(formData);
  const session = await getCurrentSession();

  const accepted = await acceptInvite({
    token: parsed.token,
    password: parsed.mode === "create-account" ? parsed.password : undefined,
    currentUserId: parsed.mode === "claim-access" ? session?.sub : undefined,
  });

  if (parsed.mode === "create-account") {
    await issueSessionCookie({
      userId: accepted.user.id,
      email: accepted.user.email,
      role: accepted.user.role,
      name: accepted.user.name,
      sessionVersion: accepted.user.sessionVersion,
    });
  }

  return accepted.engagementId ? `/app/engagements/${accepted.engagementId}` : "/app";
}

export async function acceptInviteAndRedirectAction(formData: FormData) {
  const target = await acceptInviteAction(formData);
  redirect(target);
}
