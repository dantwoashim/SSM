import { loginAndRedirectAction } from "@/lib/actions/auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <div className="auth-shell">
      <h1>Sign in</h1>
      <p>Access the assurance portal to manage engagements and reports.</p>
      <form action={loginAndRedirectAction}>
        <div className="form-fields">
          <input type="hidden" name="redirectTo" value={resolvedParams?.redirectTo || ""} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              required
            />
          </div>
          {resolvedParams?.error ? (
            <p className="error-message">{resolvedParams.error}</p>
          ) : null}
          <button type="submit" className="button-primary">
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
