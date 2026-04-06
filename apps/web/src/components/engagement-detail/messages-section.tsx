import { addMessageAction } from "@/lib/actions/engagement-actions";
import { formatDate } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { MessageView } from "./types";

export function MessagesSection({
  founderView,
  engagementId,
  messageRows,
}: {
  founderView: boolean;
  engagementId: string;
  messageRows: MessageView[];
}) {
  return (
    <section className="detail-section">
      <h3>Messages</h3>
      <form action={addMessageAction} className="form-fields">
        <input type="hidden" name="engagementId" value={engagementId} />
        {founderView ? (
          <div className="field">
            <label htmlFor="visibility">Visibility</label>
            <select id="visibility" name="visibility" defaultValue="shared">
              <option value="shared">Shared</option>
              <option value="internal">Internal</option>
            </select>
          </div>
        ) : (
          <input type="hidden" name="visibility" value="shared" />
        )}
        <div className="field">
          <label htmlFor="body">Message</label>
          <textarea id="body" name="body" />
        </div>
        <SubmitButton className="button-secondary" pendingLabel="Posting update...">
          Add update
        </SubmitButton>
      </form>
      {messageRows.length === 0 ? (
        <div className="empty-state">No messages yet.</div>
      ) : (
        <div className="activity-feed">
          {messageRows.map((message) => (
            <div key={message.id} className="activity-item">
              <strong>{message.authorName}</strong>
              <span className="activity-meta">
                {message.visibility} / {formatDate(message.createdAt)}
              </span>
              <p className="list-item-body">{message.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
