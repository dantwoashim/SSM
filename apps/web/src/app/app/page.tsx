import Link from "next/link";
import { convertLeadAction } from "@/lib/actions/engagement-actions";
import { SubmitButton } from "@/components/submit-button";
import { listPortalDataForUser } from "@/lib/data";
import { formatDate, titleCase } from "@/lib/format";
import { getRuntimeHealthSummary } from "../../lib/runtime-health";
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
  engagementId: string | null;
  updatedAt: string;
};

type DashboardNotification = {
  id: string;
  kind: string;
  status: string;
  engagementId: string | null;
  updatedAt: string;
  manualAction: string | null;
};

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const dashboard = await listPortalDataForUser({
    userId: session.sub,
    role: session.role,
  });
  const runtimeHealth = session.role === "founder" ? await getRuntimeHealthSummary().catch(() => null) : null;
  const engagementRows: DashboardEngagement[] = dashboard.engagements;
  const leadRows: DashboardLead[] = dashboard.leads;
  const recentJobRuns: DashboardJobRun[] = dashboard.recentJobRuns;
  const recentNotifications: DashboardNotification[] = dashboard.recentNotifications;

  return (
    <>
      {session.role === "founder" && runtimeHealth && (!runtimeHealth.ok || runtimeHealth.warnings.length > 0) ? (
        <div className="callout mb-lg">
          <strong>Operational attention needed</strong>
          <ul className="mt-sm">
            {runtimeHealth.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* Metrics Row */}
      <div className="metrics-row">
        <div className="metric">
          <span className="metric-value">{dashboard.engagements.length}</span>
          <span className="metric-label">
            {session.role === "founder" ? "Engagements" : "Visible"}
          </span>
        </div>
        <div className="metric">
          <span className="metric-value">{dashboard.openFindingCount}</span>
          <span className="metric-label">Open findings</span>
        </div>
        <div className="metric">
          <span className="metric-value">{dashboard.publishedReportCount}</span>
          <span className="metric-label">Published reports</span>
        </div>
        <div className="metric">
          <span className="metric-value">{dashboard.openInvites.length}</span>
          <span className="metric-label">Open invites</span>
        </div>
        <div className="metric">
          <span className="metric-value">{dashboard.activeJobCount}</span>
          <span className="metric-label">Active jobs</span>
        </div>
        {session.role === "founder" ? (
          <div className="metric">
            <span className="metric-value">{dashboard.manualNotificationCount}</span>
            <span className="metric-label">Manual notifications</span>
          </div>
        ) : null}
      </div>

      <div className="layout-sidebar">
        {/* Main Content */}
        <div>
          <h2>Engagements</h2>
          {engagementRows.length === 0 ? (
            <div className="empty-state">
              No engagements yet. Convert a lead or create one manually.
            </div>
          ) : (
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
                      <Link href={`/app/engagements/${engagement.id}`}>
                        {engagement.title}
                      </Link>
                    </td>
                    <td>
                      <span className="status-label">
                        {titleCase(engagement.status)}
                      </span>
                    </td>
                    <td>{engagement.targetCustomer}</td>
                    <td>{formatDate(engagement.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {session.role === "founder" && recentJobRuns.length > 0 ? (
            <div className="detail-section">
              <h3>Recent automation</h3>
              <div className="activity-feed">
                {recentJobRuns.map((job) => (
                  <div className="activity-item" key={job.id}>
                    <strong>{titleCase(job.name)}</strong>
                    <span className="activity-meta">
                      {titleCase(job.status)} / {formatDate(job.updatedAt)}
                      {job.engagementId ? (
                        <>
                          {" / "}
                          <Link href={`/app/engagements/${job.engagementId}`}>
                            Open
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {session.role === "founder" && recentNotifications.length > 0 ? (
            <div className="detail-section">
              <h3>Notification outbox</h3>
              <div className="activity-feed">
                {recentNotifications.map((notification) => (
                  <div className="activity-item" key={notification.id}>
                    <strong>{titleCase(notification.kind)}</strong>
                    <span className="activity-meta">
                      {titleCase(notification.status)} / {formatDate(notification.updatedAt)}
                    </span>
                    {notification.manualAction ? (
                      <p className="list-item-body">{notification.manualAction}</p>
                    ) : null}
                    {notification.engagementId ? (
                      <Link href={`/app/engagements/${notification.engagementId}`}>Open engagement</Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside>
          {session.role === "founder" ? (
            <>
              <h3>Lead intake</h3>
              {leadRows.length === 0 ? (
                <div className="empty-state">
                  No leads yet. Public intake submissions will appear here.
                </div>
              ) : (
                <div className="activity-feed">
                  {leadRows.map((lead) => (
                    <div className="activity-item" key={lead.id}>
                      <strong>{lead.intake.companyName}</strong>
                      <span className="activity-meta">
                        {lead.intake.targetCustomer} / {lead.intake.targetIdp}
                      </span>
                      <form action={convertLeadAction}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <SubmitButton pendingLabel="Converting...">
                          Convert to engagement
                        </SubmitButton>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h3>Customer access</h3>
              <div className="empty-state">
                This account only sees engagements it has been invited to.
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
