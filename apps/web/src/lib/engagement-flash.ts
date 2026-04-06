import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";

const encoder = new TextEncoder();
const secret = encoder.encode(env.sessionSecret);

type EngagementFlashPayload = {
  engagementId: string;
  inviteUrl?: string;
  notice?: string;
  error?: string;
};

function cookieName(engagementId: string) {
  return `assurance_engagement_flash_${engagementId}`;
}

export async function setEngagementFlashCookie(payload: EngagementFlashPayload) {
  const token = await new SignJWT({
    inviteUrl: payload.inviteUrl || "",
    notice: payload.notice || "",
    error: payload.error || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.engagementId)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(cookieName(payload.engagementId), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/app/engagements/${payload.engagementId}`,
    maxAge: 60 * 15,
  });
}

export async function readEngagementFlashCookie(engagementId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName(engagementId))?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);

    if (verified.payload.sub !== engagementId) {
      return null;
    }

    return {
      inviteUrl: typeof verified.payload.inviteUrl === "string" ? verified.payload.inviteUrl : "",
      notice: typeof verified.payload.notice === "string" ? verified.payload.notice : "",
      error: typeof verified.payload.error === "string" ? verified.payload.error : "",
    };
  } catch {
    return null;
  }
}
