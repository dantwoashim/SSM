import { NextResponse } from "next/server";
import { logError } from "@assurance/service/logger";
import { getRuntimeHealthSummary } from "../../../lib/runtime-health";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await getRuntimeHealthSummary();

    return NextResponse.json(
      summary,
      { status: summary.ok ? 200 : 503 },
    );
  } catch (error) {
    logError("readyz.failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Readiness check failed.",
      },
      { status: 500 },
    );
  }
}
