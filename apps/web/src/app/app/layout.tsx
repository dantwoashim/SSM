import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth-actions";
import { SubmitButton } from "@/components/submit-button";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="portal-shell">
      <div className="portal-bar">
        <div className="portal-identity">
          <h2>{session.name}</h2>
          <p>{session.role === "founder" ? "Founder" : "Customer"} / {session.email}</p>
        </div>
        <div className="actions">
          <Link className="button-secondary" href="/app">
            Dashboard
          </Link>
          {session.role === "founder" ? (
            <Link className="button-secondary" href="/app/ops">
              Operations
            </Link>
          ) : null}
          {session.role === "founder" ? (
            <Link className="button-secondary" href="/app/engagements/new">
              New engagement
            </Link>
          ) : null}
          <form action={logoutAction}>
            <SubmitButton pendingLabel="Signing out...">Sign out</SubmitButton>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
