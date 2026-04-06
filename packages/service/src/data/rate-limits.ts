import { querySql } from "./client";
import { makeId, now } from "./helpers";
import { RateLimitExceededError } from "../errors";

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function enforceRateLimit(input: {
  route: string;
  bucketKey: string;
  limit: number;
  windowMs: number;
}) {
  const timestamp = now();
  const windowCutoff = new Date(Date.now() - input.windowMs).toISOString();
  const rows = await querySql<{ count: number }>(`
    INSERT INTO request_limits (id, bucket_key, route, count, window_started_at, updated_at)
    VALUES (
      ${sqlString(makeId("limit"))},
      ${sqlString(input.bucketKey)},
      ${sqlString(input.route)},
      1,
      ${sqlString(timestamp)},
      ${sqlString(timestamp)}
    )
    ON CONFLICT (bucket_key) DO UPDATE
    SET
      route = EXCLUDED.route,
      count = CASE
        WHEN request_limits.window_started_at <= ${sqlString(windowCutoff)} THEN 1
        ELSE request_limits.count + 1
      END,
      window_started_at = CASE
        WHEN request_limits.window_started_at <= ${sqlString(windowCutoff)} THEN EXCLUDED.window_started_at
        ELSE request_limits.window_started_at
      END,
      updated_at = EXCLUDED.updated_at
    WHERE request_limits.window_started_at <= ${sqlString(windowCutoff)}
       OR request_limits.count < ${input.limit}
    RETURNING count;
  `);

  if (rows.length === 0) {
    throw new RateLimitExceededError();
  }
}
