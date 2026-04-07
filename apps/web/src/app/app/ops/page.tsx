import Link from "next/link";
import { notFound } from "next/navigation";
import { getOperationsSnapshot } from "@/lib/data";
import { formatDate, titleCase } from "@/lib/format";
import { getRuntimeHealthSummary } from "@/lib/runtime-health";
import { getCurrentSession } from "@/lib/session";

export default async function OperationsPage() {
  const session = await getCurrentSession();

  if (!session || session.role !== "founder") {
    notFound();
  }

  const [ops, runtimeHealth] = await Promise.all([
    getOperationsSnapshot(),
    getRuntimeHealthSummary().catch(() => null),
  ]);

  return (
    <div className="detail-grid">
      <section className="detail-section">
        <h2>Operations</h2>
        <div className="metrics-row">
          <div className="metric">
            <span className="metric-value">{ops.failedJobCount}</span>
            <span className="metric-label">Failed jobs</span>
          </div>
          <div className="metric">
            <span className="metric-value">{ops.queuedNotificationCount}</span>
            <span className="metric-label">Queued notifications</span>
          </div>
          <div className="metric">
            <span className="metric-value">{ops.manualNotificationCount}</span>
            <span className="metric-label">Manual follow-ups</span>
          </div>
          <div className="metric">
            <span className="metric-value">{ops.reviewAttachmentCount}</span>
            <span className="metric-label">Artifacts in review</span>
          </div>
        </div>
      </section>

      <section className="detail-section">
        <h3>Runtime health</h3>
        {runtimeHealth ? (
          <>
            <p className="muted">
              Queue mode: {runtimeHealth.queueMode} / Storage mode: {runtimeHealth.storageMode} / Worker healthy: {runtimeHealth.workerHealthy ? "yes" : "no"}
            </p>
            {runtimeHealth.warnings.length > 0 ? (
              <ul className="mt-sm">
                {runtimeHealth.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No runtime warnings at the moment.</div>
            )}
          </>
        ) : (
          <div className="empty-state">Runtime health could not be loaded.</div>
        )}
      </section>

      <section className="detail-section">
        <h3>Failed jobs</h3>
        {ops.failedJobs.length === 0 ? (
          <div className="empty-state">No failed jobs recorded.</div>
        ) : (
            <div className="activity-feed">
            {ops.failedJobs.map((job: (typeof ops.failedJobs)[number]) => (
              <div key={job.id} className="activity-item">
                <strong>{titleCase(job.name)}</strong>
                <span className="activity-meta">
                  {formatDate(job.updatedAt)}
                  {job.engagementId ? (
                    <>
                      {" / "}
                      <Link href={`/app/engagements/${job.engagementId}`}>Open engagement</Link>
                    </>
                  ) : null}
                </span>
                {job.error ? <p className="list-item-body">{job.error}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>Notification queue</h3>
        {ops.queuedNotifications.length === 0 ? (
          <div className="empty-state">No queued or in-flight notifications.</div>
        ) : (
            <div className="activity-feed">
            {ops.queuedNotifications.map((notification: (typeof ops.queuedNotifications)[number]) => (
              <div key={notification.id} className="activity-item">
                <strong>{titleCase(notification.kind)}</strong>
                <span className="activity-meta">
                  {titleCase(notification.status)} / {formatDate(notification.updatedAt)}
                </span>
                {notification.engagementId ? (
                  <Link href={`/app/engagements/${notification.engagementId}`}>Open engagement</Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>Artifacts requiring review</h3>
        {ops.reviewAttachments.length === 0 ? (
          <div className="empty-state">No artifacts are waiting on manual review.</div>
        ) : (
            <div className="activity-feed">
            {ops.reviewAttachments.map((attachment: (typeof ops.reviewAttachments)[number]) => (
              <div key={attachment.id} className="activity-item">
                <strong>{attachment.fileName}</strong>
                <span className="activity-meta">
                  {attachment.scanStatus} / {attachment.trustLevel} / {formatDate(attachment.createdAt)}
                  {attachment.engagementId ? (
                    <>
                      {" / "}
                      <Link href={`/app/engagements/${attachment.engagementId}`}>Open engagement</Link>
                    </>
                  ) : null}
                </span>
                {attachment.scanSummary ? <p className="list-item-body">{attachment.scanSummary}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="detail-section">
        <h3>Worker heartbeats</h3>
        {ops.heartbeats.length === 0 ? (
          <div className="empty-state">No worker heartbeats recorded yet.</div>
        ) : (
            <div className="activity-feed">
            {ops.heartbeats.map((heartbeat: (typeof ops.heartbeats)[number]) => (
              <div key={heartbeat.id} className="activity-item">
                <strong>{heartbeat.workerName}</strong>
                <span className="activity-meta">
                  {titleCase(heartbeat.status)} / last seen {formatDate(heartbeat.lastSeenAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
