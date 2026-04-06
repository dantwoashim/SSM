"use client";

import Link from "next/link";
import { useActionState } from "react";
import { uploadAttachmentStateAction } from "@/lib/actions/engagement-actions";
import { formatDate } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { AttachmentView, FindingView, ScenarioReview } from "./types";

export function ArtifactsSection({
  founderView,
  engagementId,
  attachmentRows,
  scenarioRows,
  findingRows,
  reportRows,
}: {
  founderView: boolean;
  engagementId: string;
  attachmentRows: AttachmentView[];
  scenarioRows: ScenarioReview[];
  findingRows: FindingView[];
  reportRows: Array<{ id: string; version: number; status: string }>;
}) {
  const [uploadState, uploadAction] = useActionState(uploadAttachmentStateAction, {
    error: "",
    notice: "",
  });

  return (
    <section className="detail-section">
      <h3>Evidence and uploads</h3>
      <form action={uploadAction} className="form-fields">
        <input type="hidden" name="engagementId" value={engagementId} />
        {founderView ? (
          <div className="field">
            <label htmlFor="attachment-visibility">Visibility</label>
            <select id="attachment-visibility" name="visibility" defaultValue="shared">
              <option value="shared">Shared</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        ) : (
          <input type="hidden" name="visibility" value="shared" />
        )}
        <div className="field">
          <label htmlFor="file">Upload artifact</label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.zip,application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,application/json,application/zip"
          />
        </div>
        {founderView ? (
          <div className="field-grid">
            <div className="field">
              <label htmlFor="attachment-scenario-run">Link to scenario</label>
              <select id="attachment-scenario-run" name="scenarioRunId" defaultValue="">
                <option value="">No direct scenario link</option>
                {scenarioRows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title || row.definition?.title || row.scenarioId}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="attachment-finding">Link to finding</label>
              <select id="attachment-finding" name="findingId" defaultValue="">
                <option value="">No direct finding link</option>
                {findingRows.map((finding) => (
                  <option key={finding.id} value={finding.id}>
                    {finding.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="attachment-report">Link to report</label>
              <select id="attachment-report" name="reportId" defaultValue="">
                <option value="">No direct report link</option>
                {reportRows.map((report) => (
                  <option key={report.id} value={report.id}>
                    Report v{report.version} ({report.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <SubmitButton className="button-secondary" pendingLabel="Uploading...">
          Upload
        </SubmitButton>
      </form>
      {uploadState.error ? <p className="error-message">{uploadState.error}</p> : null}
      {!uploadState.error && uploadState.notice ? <p className="muted">{uploadState.notice}</p> : null}
      {attachmentRows.length === 0 ? (
        <div className="empty-state">No attachments yet.</div>
      ) : (
        <div className="activity-feed">
          {attachmentRows.map((attachment) => (
            <div key={attachment.id} className="activity-item">
              <strong>{attachment.fileName}</strong>
              <span className="activity-meta">
                {attachment.visibility} / {attachment.size} bytes / {formatDate(attachment.createdAt)}
                {attachment.scenarioRunId ? " / linked scenario" : ""}
                {attachment.findingId ? " / linked finding" : ""}
                {attachment.reportId ? " / linked report" : ""}
              </span>
              <Link href={`/api/attachments/${attachment.id}`}>Download</Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
