import { NextResponse } from "next/server";
import { z } from "zod";
import { type AssuranceJob, assuranceQueueName } from "@assurance/core";
import { env, assertJobExecutorConfigured } from "@/lib/env";
import { executeQueuedJob } from "@/lib/job-execution";

export const runtime = "nodejs";

const jobSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("test-plan.generate"),
    data: z.object({
      engagementId: z.string().min(1),
      actorName: z.string().min(1),
      jobRunId: z.string().min(1),
    }),
  }),
  z.object({
    name: z.literal("report.generate"),
    data: z.object({
      engagementId: z.string().min(1),
      actorName: z.string().min(1),
      jobRunId: z.string().min(1),
    }),
  }),
]);

export async function POST(request: Request) {
  try {
    assertJobExecutorConfigured();

    if (!env.jobExecutorToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "JOB_EXECUTOR_TOKEN is not configured.",
        },
        { status: 503 },
      );
    }

    const token = request.headers.get("x-job-executor-token");

    if (token !== env.jobExecutorToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized job execution request.",
        },
        { status: 401 },
      );
    }

    const queueName = request.headers.get("x-assurance-queue");

    if (queueName && queueName !== assuranceQueueName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unexpected queue name.",
        },
        { status: 400 },
      );
    }

    const parsed = jobSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid job payload.",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await executeQueuedJob(parsed.data as AssuranceJob);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Job execution failed.",
      },
      { status: 500 },
    );
  }
}
