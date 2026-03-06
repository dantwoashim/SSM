import { NextResponse } from "next/server";
import { getDb } from "@/lib/data/client";
import { env } from "@/lib/env";
import { emailDeliveryConfigured } from "@/lib/email";
import IORedis from "ioredis";

export async function GET() {
  try {
    await getDb();
    let redis = false;

    if (env.redisUrl) {
      const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
      try {
        redis = (await connection.ping()) === "PONG";
      } finally {
        await connection.quit();
      }
    }

    return NextResponse.json({
      ok: true,
      database: true,
      redisConfigured: !!env.redisUrl,
      redis,
      storageConfigured: !!(env.s3.endpoint && env.s3.bucket),
      emailConfigured: emailDeliveryConfigured(),
    });
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
