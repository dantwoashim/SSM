import { headers } from "next/headers";

export async function getRequestIp() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("cf-connecting-ip")
    || requestHeaders.get("x-forwarded-for")
    || requestHeaders.get("x-real-ip");

  if (!forwardedFor) {
    return "unknown";
  }

  return forwardedFor.split(",")[0]!.trim();
}

export async function assertSameOriginRequest() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "https";

  if (!origin || !host) {
    return;
  }

  const expectedOrigin = `${protocol}://${host}`;

  if (origin !== expectedOrigin) {
    throw new Error("Cross-site form submission blocked.");
  }
}
