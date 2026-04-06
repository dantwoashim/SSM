import Link from "next/link";
import { acceptInviteAndRedirectAction } from "@/lib/actions/invite-actions";
import { getInviteAcceptanceState } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { getCurrentSession } from "@/lib/session";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getCurrentSession();
  const inviteState = await getInviteAcceptanceState({
    token,
    currentUserId: session?.sub,
  });

  if (!inviteState) {
    return (
      <>
        <PageHeader
          eyebrow="Invite status"
          title="This invite is invalid or expired."
          description="Ask the founder to issue a fresh invite for this engagement."
        />
      </>
    );
  }

  const { invite, mode } = inviteState;

  if (mode === "sign-in" || mode === "wrong-account") {
    const redirectTo = `/accept-invite/${token}`;
    return (
      <>
        <PageHeader
          eyebrow="Claim invite"
          title={`Join ${invite.name} to review the engagement portal.`}
          description={
            mode === "wrong-account"
              ? `This invite is for ${invite.email}. Sign out and continue with the matching account to claim access.`
              : `An account already exists for ${invite.email}. Sign in with that account to claim access.`
          }
        />
        <div className="form-shell">
          <p className="muted">
            The invite will grant customer access for {invite.email} without changing that account&apos;s password.
          </p>
          <div className="actions mt-lg">
            <Link className="button-primary" href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}>
              Sign in to claim access
            </Link>
            <Link className="button-secondary" href="/">
              Return home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Accept invite"
        title={`Join ${invite.name} to review the engagement portal.`}
        description={
          mode === "claim-access"
            ? `You are signed in as ${invite.email}. Claim access to add this engagement to your portal.`
            : `This invite grants customer access for ${invite.email}. Set a password to activate the account.`
        }
      />
      <form className="form-shell" action={acceptInviteAndRedirectAction}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="mode" value={mode} />
        <div className="field-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={invite.email} disabled />
          </div>
          {mode === "create-account" ? (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" minLength={10} required />
            </div>
          ) : null}
        </div>
        <button className="button-primary" type="submit">
          {mode === "claim-access" ? "Claim access" : "Activate account"}
        </button>
      </form>
    </>
  );
}
