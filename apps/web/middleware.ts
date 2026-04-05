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
  if (!request.nextUrl.pathname.startsWith("/app")) {
    return applySecurityHeaders(NextResponse.next());
  }

  const session = await readSessionTokenPayload(request.cookies.get("assurance_session")?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set(
      "redirectTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
