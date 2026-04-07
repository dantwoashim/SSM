import { getDb, getLatestWorkerHeartbeat } from "@assurance/service";
import { env } from "@assurance/service/env";
import { emailDeliveryConfigured } from "@/lib/email";
import { pingRedis } from "@/lib/redis";
import { checkArtifactStorageReadiness } from "@/lib/storage/provider";

export async function getRuntimeHealthSummary() {
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

  const warnings: string[] = [];
  if (!storageConfigured) {
    warnings.push("Hosted production mode requires S3-compatible storage before uploads can be treated as durable.");
  }
  if (env.redisUrl && !redis) {
    warnings.push("Redis is configured but not reachable, so queued jobs will stall.");
  }
  if (env.redisUrl && !workerHealthy) {
    warnings.push("Worker mode is configured but no healthy worker heartbeat is available.");
  }
  if (!emailDeliveryConfigured()) {
    warnings.push("Email delivery is not configured. Invites and report notifications will need manual follow-up.");
  }

  return {
    ok: (!env.redisUrl || redis) && storageReady && workerHealthy,
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
    warnings,
  };
}
