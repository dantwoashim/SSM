import { NextRequest, NextResponse } from "next/server";
import { readSessionTokenPayload } from "./src/lib/session";

function createNonce() {
  const token = crypto.randomUUID();
  return typeof btoa === "function"
    ? btoa(token)
    : Buffer.from(token).toString("base64");
}

function securityHeaders(nonce: string) {
  return [
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  [
    "Content-Security-Policy",
    `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
  ],
  ] as const;
}

function applySecurityHeaders(response: NextResponse, nonce: string, requestId: string) {
  for (const [key, value] of securityHeaders(nonce)) {
    response.headers.set(key, value);
  }

  response.headers.set("x-request-id", requestId);
  response.headers.set("x-nonce", nonce);
  return response;
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const nonce = createNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);

  if (!request.nextUrl.pathname.startsWith("/app")) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    return applySecurityHeaders(response, nonce, requestId);
  }

  // Keep middleware as a fast presence gate only. Full revocation and
  // session-version enforcement happens in the server-side auth path via
  // getCurrentSession()/readSessionCookie() inside app layout, actions, and APIs.
  const session = await readSessionTokenPayload(request.cookies.get("assurance_session")?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const response = NextResponse.redirect(url);
    return applySecurityHeaders(response, nonce, requestId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  return applySecurityHeaders(response, nonce, requestId);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
