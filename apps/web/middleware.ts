import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie } from "./src/lib/session";

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const session = await readSessionCookie(request.cookies.get("assurance_session")?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
