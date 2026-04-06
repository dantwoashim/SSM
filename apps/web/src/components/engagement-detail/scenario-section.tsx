import { addManualScenarioAction, updateScenarioResultAction } from "@/lib/actions/engagement-actions";
import { titleCase } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { AttachmentView, ScenarioReview } from "./types";

export function ScenarioSection({
  founderView,
  engagementId,
  runLabel,
  scenarioRows,
  attachmentRows,
  customerScenarioRows,
}: {
  founderView: boolean;
  engagementId: string;
  runLabel: string | null;
  scenarioRows: ScenarioReview[];
  attachmentRows: AttachmentView[];
  customerScenarioRows: Array<{
    id: string;
    title: string;
    protocol: string;
    outcome: string;
    customerSummary: string;
    evidenceCount: number;
  }>;
}) {
  return (
    <section className="detail-section">
      <h3>{runLabel || "No test plan yet"}</h3>
      {!founderView ? (
        customerScenarioRows.length === 0 ? (
          <div className="empty-state">
            Scenario execution updates will appear here after a report is published.
          </div>
        ) : (
          <div className="activity-feed">
            {customerScenarioRows.map((row) => (
              <div key={row.id} className="activity-item">
                <strong>{row.title}</strong>
                <span className="activity-meta">
                  {row.protocol} / {titleCase(row.outcome)}
                  {row.evidenceCount > 0 ? ` / ${row.evidenceCount} evidence` : ""}
                </span>
                <p className="list-item-body">{row.customerSummary}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <form action={addManualScenarioAction} className="form-fields">
            <input type="hidden" name="engagementId" value={engagementId} />
            <div className="field-grid">
              <div className="field">
                <label htmlFor="manual-title">Add manual scenario</label>
                <input
                  id="manual-title"
                  name="title"
                  placeholder="Northwind IdP-initiated launch edge case"
                />
              </div>
              <div className="field">
                <label htmlFor="manual-protocol">Protocol</label>
                <select id="manual-protocol" name="protocol" defaultValue="ops">
                  <option value="saml">SAML</option>
                  <option value="scim">SCIM</option>
                  <option value="ops">Operational</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="manual-execution-mode">Execution mode</label>
                <select id="manual-execution-mode" name="executionMode" defaultValue="manual">
                  <option value="manual">Manual</option>
                  <option value="guided">Guided</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="manual-reviewer-notes">Operator notes</label>
                <textarea
                  id="manual-reviewer-notes"
                  name="reviewerNotes"
                  placeholder="Why this scenario exists, what triggered it, and what evidence is expected."
                />
              </div>
              <div className="field">
                <label htmlFor="manual-customer-summary">Customer-visible summary</label>
                <textarea
                  id="manual-customer-summary"
                  name="customerVisibleSummary"
                  placeholder="What the customer should understand about this scenario and its current state."
                />
              </div>
              <div className="field">
                <label htmlFor="manual-report-note">Buyer-safe report note</label>
                <textarea
                  id="manual-report-note"
                  name="buyerSafeReportNote"
                  placeholder="What should appear in the assurance report if this scenario becomes relevant."
                />
              </div>
            </div>
            <SubmitButton className="button-secondary" pendingLabel="Adding scenario...">
              Add manual scenario
            </SubmitButton>
          </form>
          {scenarioRows.length === 0 ? (
            <div className="empty-state">Generate a test plan or add a manual scenario to start execution.</div>
          ) : (
            scenarioRows.map((row) => {
              const scenarioAttachmentCount = attachmentRows.filter(
                (attachment) => attachment.scenarioRunId === row.id,
              ).length;

              return (
                <div key={row.id} className="list-item">
                  <div className="list-item-header">
                    <strong>{row.title || row.definition?.title || row.scenarioId}</strong>
                    <span className="muted">
                      {row.protocol} / {row.executionMode} /{" "}
                      <span className={`status-${row.outcome}`}>{titleCase(row.outcome)}</span>
                      {scenarioAttachmentCount > 0 ? ` / ${scenarioAttachmentCount} evidence` : ""}
                    </span>
                  </div>
                  <form action={updateScenarioResultAction} className="form-fields">
                    <input type="hidden" name="engagementId" value={engagementId} />
                    <input type="hidden" name="scenarioRunId" value={row.id} />
                    <div className="field-grid">
                      <div className="field">
                        <label htmlFor={`outcome-${row.id}`}>Outcome</label>
                        <select id={`outcome-${row.id}`} name="outcome" defaultValue={row.outcome}>
                          <option value="pending">Pending</option>
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                          <option value="skipped">Skipped</option>
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`notes-${row.id}`}>Operator notes</label>
                        <textarea
                          id={`notes-${row.id}`}
                          name="reviewerNotes"
                          defaultValue={row.reviewerNotes || ""}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`customer-summary-${row.id}`}>Customer-visible summary</label>
                        <textarea
                          id={`customer-summary-${row.id}`}
                          name="customerVisibleSummary"
                          defaultValue={row.customerVisibleSummary || ""}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`report-note-${row.id}`}>Buyer-safe report note</label>
                        <textarea
                          id={`report-note-${row.id}`}
                          name="buyerSafeReportNote"
                          defaultValue={row.buyerSafeReportNote || ""}
                        />
                      </div>
                    </div>
                    <SubmitButton className="button-secondary" pendingLabel="Saving review...">
                      Save scenario review
                    </SubmitButton>
                  </form>
                </div>
              );
            })
          )}
        </>
      )}
    </section>
  );
}
