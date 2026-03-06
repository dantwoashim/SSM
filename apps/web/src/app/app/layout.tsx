import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { logoutAction } from "@/lib/actions/auth-actions";

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
    <div className="dashboard-shell">
      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="kicker">Founder portal</div>
            <h2 style={{ marginBottom: "0.25rem" }}>{session.name}</h2>
            <p className="muted" style={{ margin: 0 }}>
              {session.email}
            </p>
          </div>
          <div className="actions">
            <Link className="button-secondary" href="/app">
              Dashboard
            </Link>
            {session.role === "founder" ? (
              <Link className="button-secondary" href="/app/engagements/new">
                New engagement
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button className="button-primary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
