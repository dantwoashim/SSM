"use server";

import { revalidatePath } from "next/cache";
import {
  addManualScenario,
  updateScenarioRunResult,
} from "@/lib/data";
import {
  parseManualScenarioForm,
  parseScenarioReviewForm,
} from "@/lib/validation";
import { requireFounder } from "./shared";

export async function updateScenarioResultAction(formData: FormData) {
  const parsed = parseScenarioReviewForm(formData);
  const session = await requireFounder();
  await updateScenarioRunResult({
    scenarioRunId: parsed.scenarioRunId,
    outcome: parsed.outcome,
    reviewerNotes: parsed.reviewerNotes,
    customerVisibleSummary: parsed.customerVisibleSummary,
    buyerSafeReportNote: parsed.buyerSafeReportNote,
    actorName: session.name,
  });
  revalidatePath(`/app/engagements/${parsed.engagementId}`);
}

export async function addManualScenarioAction(formData: FormData) {
  const session = await requireFounder();
  const parsed = parseManualScenarioForm(formData);
  await addManualScenario({
    engagementId: parsed.engagementId,
    title: parsed.title,
    protocol: parsed.protocol,
    executionMode: parsed.executionMode,
    reviewerNotes: parsed.reviewerNotes,
    customerVisibleSummary: parsed.customerVisibleSummary,
    buyerSafeReportNote: parsed.buyerSafeReportNote,
    actorName: session.name,
  });
  revalidatePath(`/app/engagements/${parsed.engagementId}`);
}
