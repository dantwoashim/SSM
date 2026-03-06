"use client";

import { useActionState } from "react";
import { createInviteAction } from "@/lib/actions/engagement-actions";

const initialState = {
  inviteUrl: "",
  error: "",
  deliveryMessage: "",
};

export function InviteForm({ engagementId }: { engagementId: string }) {
  const [state, action, pending] = useActionState(createInviteAction, initialState);

  return (
    <div className="panel">
      <div className="kicker">Invite customer contact</div>
      <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
        <input type="hidden" name="engagementId" value={engagementId} />
        <div className="field">
          <label htmlFor="invite-name">Name</label>
          <input id="invite-name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="invite-email">Email</label>
          <input id="invite-email" name="email" type="email" required />
        </div>
        <button className="button-secondary" type="submit" disabled={pending}>
          {pending ? "Creating invite..." : "Create invite"}
        </button>
      </form>
      {state.error ? <p className="muted" style={{ color: "var(--danger)" }}>{state.error}</p> : null}
      {state.deliveryMessage ? <p className="muted">{state.deliveryMessage}</p> : null}
      {state.inviteUrl ? (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <strong>Invite link</strong>
          <p className="muted" style={{ wordBreak: "break-all" }}>
            {state.inviteUrl}
          </p>
        </div>
      ) : null}
    </div>
  );
}
