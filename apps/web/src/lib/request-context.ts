import { headers } from "next/headers";
import { env } from "./env";

export async function getRequestId() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-request-id") || "unknown";
}

export async function getRequestIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("cf-connecting-ip")
    || requestHeaders.get("x-real-ip")
    || (process.env.NODE_ENV !== "production" ? requestHeaders.get("x-forwarded-for") : null);

  if (!forwardedFor) {
    return "unknown";
  }

  return forwardedFor.split(",")[0]!.trim();
}

export async function getRequestMetadata() {
  return {
    requestId: await getRequestId(),
    requestIp: await getRequestIp(),
  };
}

export async function assertSameOriginRequest() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const referer = requestHeaders.get("referer");
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";

  if (!host) {
    throw new Error("Missing request origin metadata.");
  }

  const expectedOrigin = `${protocol}://${host}`;
  const allowedOrigins = new Set([expectedOrigin]);

  try {
    allowedOrigins.add(new URL(env.appUrl).origin);
  } catch {
    // Ignore malformed APP_URL during local development.
  }

  const candidateOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!candidateOrigin || !allowedOrigins.has(candidateOrigin)) {
    throw new Error("Cross-site form submission blocked.");
  }
}
