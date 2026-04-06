import { formatDate, titleCase } from "@/lib/format";
import type { JobRunView } from "./types";

export function JobHistorySection({ jobRows }: { jobRows: JobRunView[] }) {
  if (jobRows.length === 0) {
    return null;
  }

  return (
    <section className="detail-section">
      <h3>Job history</h3>
      <div className="activity-feed">
        {jobRows.map((job) => (
          <div key={job.id} className="activity-item">
            <strong>{titleCase(job.name)}</strong>
            <span className="activity-meta">
              {titleCase(job.status)} / Updated {formatDate(job.updatedAt)}
              {job.queueId ? ` / Queue ${job.queueId}` : null}
              {job.completedAt ? ` / Completed ${formatDate(job.completedAt)}` : null}
            </span>
            {job.error ? <p className="error-message">{job.error}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
