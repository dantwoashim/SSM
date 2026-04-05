import type { IntakePayload } from "@assurance/core";
import { leads } from "./schema";
import { runInTransaction } from "./client";
import { makeId, now } from "./helpers";
import { audit } from "./audit";

export async function createLead(input: IntakePayload) {
  return runInTransaction(async (db) => {
    const timestamp = now();
    const lead = {
      id: makeId("lead"),
      status: "new",
      intake: input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(leads).values(lead);
    await audit(
      input.contactName,
      "created_lead",
      "lead",
      lead.id,
      {
        companyName: input.companyName,
        targetCustomer: input.targetCustomer,
      },
      db,
    );
    return lead;
  });
}
