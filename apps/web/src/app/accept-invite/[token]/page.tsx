import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/lib/actions/invite-actions";
import { getInviteByToken } from "@/lib/data";
import { PageHeader } from "@/components/page-header";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
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

  async function action(formData: FormData) {
    "use server";
    const target = await acceptInviteAction(formData);
    redirect(target);
  }

  return (
    <>
      <PageHeader
        eyebrow="Accept invite"
        title={`Join ${invite.name} to review the engagement portal.`}
        description={`This invite grants customer access for ${invite.email}. Set a password to activate the account.`}
      />
      <form className="panel form-shell" action={action}>
        <input type="hidden" name="token" value={token} />
        <div className="field-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={invite.email} disabled />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={10} required />
          </div>
        </div>
        <button className="button-primary" type="submit">
          Activate account
        </button>
      </form>
    </>
  );
}
