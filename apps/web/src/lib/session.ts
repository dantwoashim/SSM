import { JWTPayload, jwtVerify, SignJWT } from "jose";
import { assertSessionConfigured, env } from "./env";

const encoder = new TextEncoder();
const secret = encoder.encode(env.sessionSecret);
const cookieName = "assurance_session";

interface SessionPayload extends JWTPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
  sessionVersion: number;
}

export async function issueSessionCookie(payload: {
  userId: string;
  email: string;
  role: string;
  name: string;
  sessionVersion: number;
}) {
  assertSessionConfigured();
  const { cookies } = await import("next/headers");
  const token = await new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
    sessionVersion: payload.sessionVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function readSessionCookie(token?: string | null): Promise<SessionPayload | null> {
  assertSessionConfigured();
  if (!token) {
    return null;
  }

  try {
    const payload = await readSessionTokenPayload(token);

    if (!payload) {
      return null;
    }

    const { getUserById } = await import("./data/access");
    const user = await getUserById(payload.sub);

    if (!user || user.sessionVersion !== payload.sessionVersion) {
      return null;
    }

    return {
      ...payload,
      email: user.email,
      role: user.role,
      name: user.name,
      sessionVersion: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function readSessionTokenPayload(token?: string | null): Promise<SessionPayload | null> {
  assertSessionConfigured();
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return readSessionCookie(cookieStore.get(cookieName)?.value);
}
