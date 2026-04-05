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
    <div>
      <form action={action} className="form-fields">
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
        <button className="button-secondary" type="submit" disabled={pending}>
          {pending ? "Creating invite..." : "Create invite"}
        </button>
      </form>
      {state.error ? <p className="error-message">{state.error}</p> : null}
      {state.deliveryMessage ? <p className="muted">{state.deliveryMessage}</p> : null}
      {state.inviteUrl ? (
        <div className="mt-md">
          <strong>Invite link</strong>
          <p className="muted break-anywhere">{state.inviteUrl}</p>
        </div>
      ) : null}
    </div>
  );
}
