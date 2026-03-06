import Link from "next/link";
import { convertLeadAction } from "@/lib/actions/engagement-actions";
import { ensureFounderUser, listPortalDataForUser } from "@/lib/data";
import { formatDate, titleCase } from "@/lib/format";
import { getCurrentSession } from "@/lib/session";

type DashboardEngagement = {
  id: string;
  title: string;
  status: string;
  targetCustomer: string;
  deadline: string | null;
};

type DashboardLead = {
  id: string;
  intake: {
    companyName: string;
    targetCustomer: string;
    targetIdp: string;
    timeline: string;
  };
};

type DashboardJobRun = {
  id: string;
  name: string;
  status: string;
  engagementId: string;
  updatedAt: string;
};

export default async function DashboardPage() {
  await ensureFounderUser();
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const dashboard = await listPortalDataForUser({
    userId: session.sub,
    role: session.role,
  });
  const engagementRows: DashboardEngagement[] = dashboard.engagements;
  const leadRows: DashboardLead[] = dashboard.leads;
  const recentJobRuns: DashboardJobRun[] = dashboard.recentJobRuns;

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="kicker">Pipeline snapshot</div>
        <h2>Enterprise identity work in motion</h2>
        <div className="grid-three">
          <div className="panel">
            <div className="kicker">
              {session.role === "founder" ? "Qualified engagements" : "Visible engagements"}
            </div>
            <h3>{dashboard.engagements.length}</h3>
          </div>
          <div className="panel">
            <div className="kicker">Open findings</div>
            <h3>{dashboard.openFindingCount}</h3>
          </div>
          <div className="panel">
            <div className="kicker">Active jobs</div>
            <h3>{dashboard.activeJobCount}</h3>
          </div>
          <div className="panel">
            <div className="kicker">Open invites</div>
            <h3>{dashboard.openInvites.length}</h3>
          </div>
          <div className="panel">
            <div className="kicker">Published reports</div>
            <h3>{dashboard.publishedReportCount}</h3>
          </div>
          <div className="panel">
            <div className="kicker">Role</div>
            <h3>{titleCase(session.role)}</h3>
          </div>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Engagement</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {engagementRows.map((engagement) => (
                <tr key={engagement.id}>
                  <td>
                    <Link href={`/app/engagements/${engagement.id}`}>{engagement.title}</Link>
                  </td>
                  <td>{titleCase(engagement.status)}</td>
                  <td>{engagement.targetCustomer}</td>
                  <td>{formatDate(engagement.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {session.role === "founder" ? (
          <div style={{ marginTop: "1rem" }}>
            <h3>Recent automation activity</h3>
            {recentJobRuns.length === 0 ? (
              <div className="empty-state">No automation jobs have run yet.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {recentJobRuns.map((job) => (
                  <article className="panel" key={job.id}>
                    <strong>{titleCase(job.name)}</strong>
                    <p className="muted">
                      {titleCase(job.status)} / {formatDate(job.updatedAt)}
                    </p>
                    <Link href={`/app/engagements/${job.engagementId}`}>Open engagement</Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <aside className="panel">
        {session.role === "founder" ? (
          <>
            <div className="kicker">Lead intake</div>
            <h2>Recent requests</h2>
            {leadRows.length === 0 ? (
              <div className="empty-state">No leads yet. Public intake submissions will appear here.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {leadRows.map((lead) => (
                  <article key={lead.id} className="panel">
                    <strong>{lead.intake.companyName}</strong>
                    <p className="muted">
                      {lead.intake.targetCustomer} / {lead.intake.targetIdp}
                    </p>
                    <p>{lead.intake.timeline}</p>
                    <form action={convertLeadAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button className="button-primary" type="submit">
                        Convert to engagement
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="kicker">Portal access</div>
            <h2>Customer contact view</h2>
            <div className="empty-state">
              This account only sees engagements it has been invited to. Founder-only pipeline and lead intake remain hidden.
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
