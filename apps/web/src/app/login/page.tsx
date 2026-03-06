import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions/auth-actions";
import { PageHeader } from "@/components/page-header";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirectTo?: string }>;
}) {
  async function action(formData: FormData) {
    "use server";
    const redirectTo = formData.get("redirectTo")?.toString() || "/app";
    await loginAction(formData);
    redirect(redirectTo);
  }

  return (
    <div className="auth-shell">
      <PageHeader
        eyebrow="Portal access"
        title="Invite-only login for founders and customer contacts."
        description="Use the seeded founder account or a manually created invited account."
      />
      <form className="panel form-shell" action={action}>
        <input type="hidden" name="redirectTo" defaultValue="/app" />
        <div className="field-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required />
          </div>
        </div>
        <div className="actions">
          <button className="button-primary" type="submit">
            Sign in
          </button>
        </div>
        <p className="muted">
          Set founder credentials in <code>apps/web/.env.local</code> and run <code>npm run seed</code>.
        </p>
      </form>
    </div>
  );
}
