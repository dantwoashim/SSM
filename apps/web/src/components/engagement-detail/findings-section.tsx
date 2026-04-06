import { titleCase } from "@/lib/format";
import type { AttachmentView, FindingView } from "./types";

export function FindingsSection({
  findingRows,
  attachmentRows,
}: {
  findingRows: FindingView[];
  attachmentRows: AttachmentView[];
}) {
  return (
    <section className="detail-section">
      <h3>Open findings</h3>
      {findingRows.length === 0 ? (
        <div className="empty-state">
          No findings yet. Failed scenarios promote into structured remediation items.
        </div>
      ) : (
        findingRows.map((finding) => {
          const evidenceCount = attachmentRows.filter((attachment) => attachment.findingId === finding.id).length;
          return (
            <div key={finding.id} className="list-item">
              <div className="list-item-header">
                <strong className={`severity-${finding.severity}`}>{finding.title}</strong>
                <span className="status-label">
                  {titleCase(finding.status)}
                  {evidenceCount > 0 ? ` / ${evidenceCount} evidence` : ""}
                </span>
              </div>
              <p className="list-item-body">{finding.summary}</p>
              <p className="muted">{finding.remediation}</p>
            </div>
          );
        })
      )}
    </section>
  );
}
