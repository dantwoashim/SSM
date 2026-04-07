"use server";

import { getCurrentSession } from "@/lib/session";
import { hasEngagementAccess } from "@/lib/data";
import { assertSameOriginRequest, getRequestMetadata } from "@/lib/request-context";

export async function requireActor() {
  await assertSameOriginRequest();
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

export async function requireFounder() {
  const session = await requireActor();

  if (session.role !== "founder") {
    throw new Error("Founder access required.");
  }

  return session;
}

export async function requireEngagementAccess(engagementId: string) {
  const session = await requireActor();
  const allowed = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId,
  });

  if (!allowed) {
    throw new Error("Engagement access denied.");
  }

  return session;
}

export async function getRequestIdSafe() {
  try {
    const meta = await getRequestMetadata();
    return meta.requestId;
  } catch {
    return "unknown";
  }
}
