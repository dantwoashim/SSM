import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addMessageAction,
  generateReportAction,
  generateTestPlanAction,
  publishReportAction,
  updateScenarioResultAction,
  uploadAttachmentAction,
} from "@/lib/actions/engagement-actions";
import {
  getEngagementDetail,
  hasEngagementAccess,
  listOpenInvitesForEngagement,
  listScenariosForRun,
} from "@/lib/data";
import { SubmitButton } from "@/components/submit-button";
import { formatDate, titleCase } from "@/lib/format";
import { getCurrentSession } from "@/lib/session";
import { InviteForm } from "@/components/invite-form";

type ScenarioReview = {
  id: string;
  scenarioId: string;
  protocol: string;
  executionMode: string;
  outcome: string;
  reviewerNotes: string | null;
  definition?: {
    title: string;
  };
};

type FindingView = {
  id: string;
  title: string;
  severity: string;
  summary: string;
  remediation: string;
  status: string;
};

type MessageView = {
  id: string;
  authorName: string;
  visibility: string;
  createdAt: string;
  body: string;
};

type AttachmentView = {
  id: string;
  fileName: string;
  visibility: string;
  size: number;
  createdAt: string;
};

type JobRunView = {
  id: string;
  name: string;
  status: string;
  queueId: string | null;
  error: string | null;
  updatedAt: string;
  completedAt: string | null;
};

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();

  if (!session) {
    notFound();
  }

  const hasAccess = await hasEngagementAccess({
    userId: session.sub,
    role: session.role,
    engagementId: id,
  });

  if (!hasAccess) {
    notFound();
  }

  const detail = await getEngagementDetail(id);

  if (!detail) {
    notFound();
  }

  const founderView = session.role === "founder";
  const scenarioRows: ScenarioReview[] = detail.latestRun
    ? await listScenariosForRun(detail.latestRun.id)
    : [];
  const findingRows: FindingView[] = detail.findingRows;
  const messageRows: MessageView[] = founderView
    ? detail.messageRows
    : detail.messageRows.filter((message: MessageView) => message.visibility === "shared");
  const attachmentRows: AttachmentView[] = founderView
    ? detail.attachmentRows
    : detail.attachmentRows.filter((attachment: AttachmentView) => attachment.visibility === "shared");
  const reportRows = founderView
    ? detail.reportRows
    : detail.reportRows.filter((report: { status: string }) => report.status === "published");
  const latestReport = reportRows[0];
  const jobRows: JobRunView[] = detail.jobRows;
  const openInvites =
    founderView ? await listOpenInvitesForEngagement(detail.engagement.id) : [];

  return (
    <div className="detail-grid">
      {/* Overview */}
      <section className="detail-section">
        <h2>{detail.engagement.title}</h2>
        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="metric-label">Status</span>
            <strong className="status-label">{titleCase(detail.engagement.status)}</strong>
          </div>
          <div className="detail-meta-item">
            <span className="metric-label">Target customer</span>
            <strong>{detail.engagement.targetCustomer}</strong>
          </div>
          <div className="detail-meta-item">
            <span className="metric-label">Deadline</span>
            <strong>{formatDate(detail.engagement.deadline)}</strong>
          </div>
        </div>
        <div className="tag-row">
          {detail.engagement.claimedFeatures.map((feature: string) => (
            <span className="tag" key={feature}>
              {feature}
            </span>
          ))}
        </div>
        {founderView ? (
          <div className="actions mt-lg">
            <form action={generateTestPlanAction}>
              <input type="hidden" name="engagementId" value={detail.engagement.id} />
              <SubmitButton pendingLabel="Generating plan...">Generate test plan</SubmitButton>
            </form>
            <form action={generateReportAction}>
              <input type="hidden" name="engagementId" value={detail.engagement.id} />
              <SubmitButton className="button-secondary" pendingLabel="Drafting report...">
                Draft report
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="muted mt-md">Customer view</p>
        )}
      </section>

      {/* Scenario Execution */}
      <section className="detail-section">
        <h3>{detail.latestRun ? detail.latestRun.label : "No test plan yet"}</h3>
        {!founderView ? (
          <div className="empty-state">
            Scenario execution controls are only visible to founder operators.
          </div>
        ) : scenarioRows.length === 0 ? (
          <div className="empty-state">Generate a test plan to create scenario runs.</div>
        ) : (
          scenarioRows.map((row) => (
            <div key={row.id} className="list-item">
              <div className="list-item-header">
                <strong>{row.definition?.title || row.scenarioId}</strong>
                <span className="muted">
                  {row.protocol} / {row.executionMode} /{" "}
                  <span className={`status-${row.outcome}`}>{titleCase(row.outcome)}</span>
                </span>
              </div>
              <form action={updateScenarioResultAction} className="form-fields">
                <input type="hidden" name="engagementId" value={detail.engagement.id} />
                <input type="hidden" name="scenarioRunId" value={row.id} />
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor={`outcome-${row.id}`}>Outcome</label>
                    <select id={`outcome-${row.id}`} name="outcome" defaultValue={row.outcome}>
                      <option value="pending">Pending</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor={`notes-${row.id}`}>Reviewer notes</label>
                    <textarea
                      id={`notes-${row.id}`}
                      name="reviewerNotes"
                      defaultValue={row.reviewerNotes || ""}
                    />
                  </div>
                </div>
                <SubmitButton className="button-secondary" pendingLabel="Saving review...">
                  Save scenario review
                </SubmitButton>
              </form>
            </div>
          ))
        )}
      </section>

      {/* Findings */}
      <section className="detail-section">
        <h3>Open findings</h3>
        {findingRows.length === 0 ? (
          <div className="empty-state">
            No findings yet. Failed scenarios promote into structured remediation items.
          </div>
        ) : (
          findingRows.map((finding) => (
            <div key={finding.id} className="list-item">
              <div className="list-item-header">
                <strong className={`severity-${finding.severity}`}>{finding.title}</strong>
                <span className="status-label">{titleCase(finding.status)}</span>
              </div>
              <p className="list-item-body">{finding.summary}</p>
              <p className="muted">{finding.remediation}</p>
            </div>
          ))
        )}
      </section>

      {/* Latest Report */}
      <section className="detail-section">
        <h3>Latest report</h3>
        {latestReport ? (
          <>
            <p>{latestReport.executiveSummary}</p>
            <div className="metrics-row metrics-row-compact">
              <div className="metric">
                <span className="metric-value">{latestReport.readinessScore}</span>
                <span className="metric-label">Readiness</span>
              </div>
              <div className="metric">
                <span className="metric-value">v{latestReport.version}</span>
                <span className="metric-label">Version</span>
              </div>
              <div className="metric">
                <span className="metric-value status-label">{titleCase(latestReport.status)}</span>
                <span className="metric-label">Status</span>
              </div>
            </div>
            <div className="actions mt-lg">
              <Link className="button-secondary" href={`/api/reports/${latestReport.id}/pdf`}>
                Download PDF
              </Link>
              {founderView ? (
                <form action={publishReportAction}>
                  <input type="hidden" name="reportId" value={latestReport.id} />
                  <input type="hidden" name="engagementId" value={detail.engagement.id} />
                  <SubmitButton pendingLabel="Publishing report...">Publish report</SubmitButton>
                </form>
              ) : null}
            </div>
          </>
        ) : (
          <div className="empty-state">
            {founderView ? "No report drafted yet." : "No published report is available yet."}
          </div>
        )}
      </section>

      {/* Messages */}
      <section className="detail-section">
        <h3>Messages</h3>
        <form action={addMessageAction} className="form-fields">
          <input type="hidden" name="engagementId" value={detail.engagement.id} />
          {founderView ? (
            <div className="field">
              <label htmlFor="visibility">Visibility</label>
              <select id="visibility" name="visibility" defaultValue="shared">
                <option value="shared">Shared</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="visibility" value="shared" />
          )}
          <div className="field">
            <label htmlFor="body">Message</label>
            <textarea id="body" name="body" />
          </div>
          <SubmitButton className="button-secondary" pendingLabel="Posting update...">
            Add update
          </SubmitButton>
        </form>
        {messageRows.length === 0 ? (
          <div className="empty-state">No messages yet.</div>
        ) : (
          <div className="activity-feed">
            {messageRows.map((message) => (
              <div key={message.id} className="activity-item">
                <strong>{message.authorName}</strong>
                <span className="activity-meta">
                  {message.visibility} / {formatDate(message.createdAt)}
                </span>
                <p className="list-item-body">{message.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Artifacts */}
      <section className="detail-section">
        <h3>Evidence and uploads</h3>
        <form action={uploadAttachmentAction} className="form-fields">
          <input type="hidden" name="engagementId" value={detail.engagement.id} />
          {founderView ? (
            <div className="field">
              <label htmlFor="attachment-visibility">Visibility</label>
              <select id="attachment-visibility" name="visibility" defaultValue="shared">
                <option value="shared">Shared</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          ) : (
            <input type="hidden" name="visibility" value="shared" />
          )}
          <div className="field">
            <label htmlFor="file">Upload artifact</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.json,.zip,application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,application/json,application/zip"
            />
          </div>
          <SubmitButton className="button-secondary" pendingLabel="Uploading...">
            Upload
          </SubmitButton>
        </form>
        {attachmentRows.length === 0 ? (
          <div className="empty-state">No attachments yet.</div>
        ) : (
          <div className="activity-feed">
            {attachmentRows.map((attachment) => (
              <div key={attachment.id} className="activity-item">
                <strong>{attachment.fileName}</strong>
                <span className="activity-meta">
                  {attachment.visibility} / {attachment.size} bytes / {formatDate(attachment.createdAt)}
                </span>
                <Link href={`/api/attachments/${attachment.id}`}>Download</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Jobs (founder only) */}
      {founderView && jobRows.length > 0 ? (
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
      ) : null}

      {/* Invites (founder only) */}
      {founderView ? (
        <section className="detail-section">
          <h3>Customer access</h3>
          <InviteForm engagementId={detail.engagement.id} />
          {openInvites.length > 0 ? (
            <>
              <h4 className="mt-lg">Pending invites</h4>
              <div className="activity-feed">
                {openInvites.map((invite: { id: string; name: string; email: string; createdAt: string }) => (
                  <div key={invite.id} className="activity-item">
                    <strong>{invite.name}</strong>
                    <span className="activity-meta">
                      {invite.email} / Issued {formatDate(invite.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">No pending invites for this engagement.</div>
          )}
        </section>
      ) : (
        <section className="detail-section">
          <h3>Access scope</h3>
          <div className="empty-state">
            Internal notes, draft reports, and internal-only artifacts remain hidden from invited customer contacts.
          </div>
        </section>
      )}
    </div>
  );
}
