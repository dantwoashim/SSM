import { NextResponse } from "next/server";
import { getDb, getLatestWorkerHeartbeat } from "@assurance/service";
import { env } from "@assurance/service/env";
import { emailDeliveryConfigured } from "@/lib/email";
import { logError } from "@assurance/service/logger";
import { pingRedis } from "@/lib/redis";
import { checkArtifactStorageReadiness } from "@/lib/storage/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb();
    const redis = env.redisUrl ? await pingRedis() : false;
    const storageMode = env.s3.endpoint && env.s3.bucket
      ? "s3"
      : process.env.NODE_ENV === "production" && env.allowLocalProd !== "1"
        ? "unconfigured"
        : "local";
    const storageConfigured = storageMode !== "unconfigured";
    const storageReady = await checkArtifactStorageReadiness().catch(() => false);
    const queueMode = env.redisUrl ? "worker" : "inline";
    const latestWorkerHeartbeat = env.redisUrl ? await getLatestWorkerHeartbeat() : null;
    const workerHealthy = !env.redisUrl
      || !!(
        latestWorkerHeartbeat
        && latestWorkerHeartbeat.status === "running"
        && Date.now() - new Date(latestWorkerHeartbeat.lastSeenAt).getTime() < 90_000
      );
    const ready = (!env.redisUrl || redis) && storageReady && workerHealthy;

    return NextResponse.json(
      {
        ok: ready,
        database: true,
        redisConfigured: !!env.redisUrl,
        redis,
        queueMode,
        storageMode,
        storageConfigured,
        storageReady,
        workerHealthy,
        latestWorkerHeartbeat,
        emailConfigured: emailDeliveryConfigured(),
      },
      { status: ready ? 200 : 503 },
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
