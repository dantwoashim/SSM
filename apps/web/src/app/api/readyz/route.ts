import { NextResponse } from "next/server";
import { getDb } from "@/lib/data/client";
import { env, isLocalProdMode, isProductionLike } from "@/lib/env";
import { emailDeliveryConfigured } from "@/lib/email";
import { pingRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb();
    const redis = env.redisUrl ? await pingRedis() : false;
    const storageConfigured = !!(env.s3.endpoint && env.s3.bucket);
    const jobExecutorConfigured = !!env.jobExecutorToken || !env.redisUrl;
    const storageReady = !isProductionLike() || isLocalProdMode() || storageConfigured;
    const ready = (!env.redisUrl || redis) && jobExecutorConfigured && storageReady;

    return NextResponse.json(
      {
        ok: ready,
        database: true,
        redisConfigured: !!env.redisUrl,
        redis,
        jobExecutorConfigured,
        storageConfigured,
        storageReady,
        emailConfigured: emailDeliveryConfigured(),
      },
      { status: ready ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Readiness check failed.",
      },
      { status: 500 },
    );
  }
}
