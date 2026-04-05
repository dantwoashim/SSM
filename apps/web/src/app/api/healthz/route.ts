import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "identity-go-live-assurance-web",
    timestamp: new Date().toISOString(),
  });
}
