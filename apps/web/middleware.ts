import { NextRequest, NextResponse } from "next/server";
import { readSessionTokenPayload } from "./src/lib/session";

const securityHeaders = [
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  [
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  ],
] as const;

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of securityHeaders) {
    response.headers.set(key, value);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  if (!request.nextUrl.pathname.startsWith("/app")) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set("x-request-id", requestId);
    return applySecurityHeaders(response);
  }

  const session = await readSessionTokenPayload(request.cookies.get("assurance_session")?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    const response = NextResponse.redirect(url);
    response.headers.set("x-request-id", requestId);
    return applySecurityHeaders(response);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("x-request-id", requestId);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
