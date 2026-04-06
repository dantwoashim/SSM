import { formatDate, titleCase } from "@/lib/format";

export function NotificationSection({
  notificationRows,
}: {
  notificationRows: Array<{
    id: string;
    kind: string;
    status: string;
    updatedAt: string;
    manualAction: string | null;
    lastError: string | null;
  }>;
}) {
  return (
    <section className="detail-section">
      <h3>Notification outbox</h3>
      {notificationRows.length === 0 ? (
        <div className="empty-state">No notifications have been recorded for this engagement yet.</div>
      ) : (
        <div className="activity-feed">
          {notificationRows.map((notification) => (
            <div key={notification.id} className="activity-item">
              <strong>{titleCase(notification.kind)}</strong>
              <span className="activity-meta">
                {titleCase(notification.status)} / {formatDate(notification.updatedAt)}
              </span>
              {notification.manualAction ? (
                <p className="list-item-body">{notification.manualAction}</p>
              ) : null}
              {!notification.manualAction && notification.lastError ? (
                <p className="list-item-body">{notification.lastError}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
