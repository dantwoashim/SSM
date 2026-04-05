import { NextResponse } from "next/server";
import { z } from "zod";
import { env, assertJobExecutorConfigured } from "@/lib/env";
import { recordWorkerHeartbeat } from "@/lib/data";

export const runtime = "nodejs";

const heartbeatSchema = z.object({
  workerName: z.string().min(1).max(120),
  status: z.enum(["starting", "running", "stopped"]),
  queueName: z.string().min(1).max(120).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    assertJobExecutorConfigured();

    if (!env.jobExecutorToken) {
      return NextResponse.json({ ok: false, error: "JOB_EXECUTOR_TOKEN is not configured." }, { status: 503 });
    }

    const token = request.headers.get("x-job-executor-token");

    if (token !== env.jobExecutorToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized worker heartbeat request." }, { status: 401 });
    }

    const parsed = heartbeatSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid heartbeat payload.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const row = await recordWorkerHeartbeat({
      workerName: parsed.data.workerName,
      status: parsed.data.status,
      queueName: parsed.data.queueName || null,
      metadata: parsed.data.metadata || {},
    });

    return NextResponse.json({ ok: true, heartbeat: row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Worker heartbeat failed." },
      { status: 500 },
    );
  }
}
