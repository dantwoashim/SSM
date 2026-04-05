import { NextResponse } from "next/server";
import { getDb } from "@/lib/data/client";
import { getLatestWorkerHeartbeat } from "@/lib/data";
import { env, isLocalProdMode, isProductionLike } from "@/lib/env";
import { emailDeliveryConfigured } from "@/lib/email";
import { logError } from "@/lib/logger";
import { pingRedis } from "@/lib/redis";
import { checkArtifactStorageReadiness } from "@/lib/storage/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb();
    const redis = env.redisUrl ? await pingRedis() : false;
    const storageConfigured = !!(env.s3.endpoint && env.s3.bucket);
    const jobExecutorConfigured = !!env.jobExecutorToken || !env.redisUrl;
    const storageReady = await checkArtifactStorageReadiness().catch(() => false);
    const queueMode = env.redisUrl ? "worker" : "inline";
    const latestWorkerHeartbeat = env.redisUrl ? await getLatestWorkerHeartbeat() : null;
    const workerHealthy = !env.redisUrl
      || !!(
        latestWorkerHeartbeat
        && latestWorkerHeartbeat.status === "running"
        && Date.now() - new Date(latestWorkerHeartbeat.lastSeenAt).getTime() < 90_000
      );
    const ready = (!env.redisUrl || redis) && jobExecutorConfigured && storageReady && workerHealthy;

    return NextResponse.json(
      {
        ok: ready,
        database: true,
        redisConfigured: !!env.redisUrl,
        redis,
        jobExecutorConfigured,
        queueMode,
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
