import { Queue } from "bullmq";
import IORedis from "ioredis";
import { assuranceQueueName, type AssuranceJob } from "@assurance/core";
import { env } from "./env";

let redisConnection: IORedis | null = null;
let assuranceQueue: Queue<AssuranceJob["data"]> | null = null;

export function getRedisConnection() {
  if (!env.redisUrl) {
    return null;
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });
  }

  return redisConnection;
}

export function getAssuranceQueue() {
  const connection = getRedisConnection();

  if (!connection) {
    return null;
  }

  if (!assuranceQueue) {
    assuranceQueue = new Queue<AssuranceJob["data"]>(assuranceQueueName, {
      connection: connection as any,
    });
  }

  return assuranceQueue;
}

export async function pingRedis() {
  const connection = getRedisConnection();

  if (!connection) {
    return false;
  }

  return (await connection.ping()) === "PONG";
}
