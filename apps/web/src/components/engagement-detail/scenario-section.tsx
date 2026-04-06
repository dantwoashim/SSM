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
}: {
  founderView: boolean;
  engagementId: string;
  runLabel: string | null;
  scenarioRows: ScenarioReview[];
  attachmentRows: AttachmentView[];
}) {
  return (
    <section className="detail-section">
      <h3>{runLabel || "No test plan yet"}</h3>
      {!founderView ? (
        <div className="empty-state">
          Scenario execution controls are only visible to founder operators.
        </div>
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
                  <option value="oidc">OIDC</option>
                  <option value="scim">SCIM</option>
                  <option value="ops">Operational</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="manual-execution-mode">Execution mode</label>
                <select id="manual-execution-mode" name="executionMode" defaultValue="manual">
                  <option value="manual">Manual</option>
                  <option value="guided">Guided</option>
                  <option value="automated">Automated</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="manual-reviewer-notes">Initial notes</label>
                <textarea
                  id="manual-reviewer-notes"
                  name="reviewerNotes"
                  placeholder="Why this scenario exists, what triggered it, and what evidence is expected."
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
                        <label htmlFor={`notes-${row.id}`}>Reviewer notes</label>
                        <textarea
                          id={`notes-${row.id}`}
                          name="reviewerNotes"
                          defaultValue={row.reviewerNotes || ""}
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
