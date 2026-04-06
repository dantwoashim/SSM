import { createInviteAndRedirectAction } from "@/lib/actions/engagement-actions";
import { formatDate } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export function CustomerAccessSection({
  founderView,
  engagementId,
  inviteFlash,
  openInvites,
}: {
  founderView: boolean;
  engagementId: string;
  inviteFlash: { inviteUrl: string; notice: string; error: string } | null;
  openInvites: Array<{ id: string; name: string; email: string; createdAt: string }>;
}) {
  if (!founderView) {
    return (
      <section className="detail-section">
        <h3>Access scope</h3>
        <div className="empty-state">
          Internal notes, draft reports, and internal-only artifacts remain hidden from invited customer contacts.
        </div>
      </section>
    );
  }

  return (
    <section className="detail-section">
      <h3>Customer access</h3>
      <form action={createInviteAndRedirectAction} className="form-fields">
        <input type="hidden" name="engagementId" value={engagementId} />
        <div className="field-grid">
          <div className="field">
            <label htmlFor="invite-name">Name</label>
            <input id="invite-name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="invite-email">Email</label>
            <input id="invite-email" name="email" type="email" required />
          </div>
        </div>
        <SubmitButton className="button-secondary" pendingLabel="Creating invite...">
          Create invite
        </SubmitButton>
      </form>
      {inviteFlash?.error ? (
        <p className="error-message">{inviteFlash.error}</p>
      ) : null}
      {inviteFlash?.notice ? (
        <p className="muted">{inviteFlash.notice}</p>
      ) : null}
      {inviteFlash?.inviteUrl ? (
        <div className="mt-md">
          <strong>Invite link</strong>
          <p className="muted break-anywhere">{inviteFlash.inviteUrl}</p>
        </div>
      ) : null}
      {openInvites.length > 0 ? (
        <>
          <h4 className="mt-lg">Pending invites</h4>
          <div className="activity-feed">
            {openInvites.map((invite) => (
              <div key={invite.id} className="activity-item">
                <strong>{invite.name}</strong>
                <span className="activity-meta">
                  {invite.email} / Issued {formatDate(invite.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">No pending invites for this engagement.</div>
      )}
    </section>
  );
}
