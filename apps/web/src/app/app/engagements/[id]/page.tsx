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
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel">
        <div className="kicker">Engagement overview</div>
        <h2>{detail.engagement.title}</h2>
        <div className="grid-three">
          <div className="panel">
            <div className="kicker">Status</div>
            <strong>{titleCase(detail.engagement.status)}</strong>
          </div>
          <div className="panel">
            <div className="kicker">Target customer</div>
            <strong>{detail.engagement.targetCustomer}</strong>
          </div>
          <div className="panel">
            <div className="kicker">Deadline</div>
            <strong>{formatDate(detail.engagement.deadline)}</strong>
          </div>
        </div>
        <div className="pill-row">
          {detail.engagement.claimedFeatures.map((feature: string) => (
            <span className="pill" key={feature}>
              {feature}
            </span>
          ))}
        </div>
        <div className="actions">
          {founderView ? (
            <>
              <form action={generateTestPlanAction}>
                <input type="hidden" name="engagementId" value={detail.engagement.id} />
                <button className="button-primary" type="submit">
                  Generate test plan
                </button>
              </form>
              <form action={generateReportAction}>
                <input type="hidden" name="engagementId" value={detail.engagement.id} />
                <button className="button-secondary" type="submit">
                  Draft report
                </button>
              </form>
            </>
          ) : (
            <span className="pill">Customer view</span>
          )}
        </div>
      </section>

      <div className="grid-two">
        <section className="panel">
          <div className="kicker">Scenario execution</div>
          <h3>{detail.latestRun ? detail.latestRun.label : "No test plan yet"}</h3>
          {!founderView ? (
            <div className="empty-state">
              Scenario execution and remediation controls are only visible to founder operators.
            </div>
          ) : scenarioRows.length === 0 ? (
            <div className="empty-state">Generate a test plan to create scenario runs.</div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {scenarioRows.map((row) => (
                <article key={row.id} className="panel">
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
                      <strong>{row.definition?.title || row.scenarioId}</strong>
                      <p className="muted" style={{ marginBottom: "0.5rem" }}>
                        {row.protocol} / {row.executionMode} / {row.outcome}
                      </p>
                    </div>
                  </div>
                  <form action={updateScenarioResultAction} style={{ display: "grid", gap: "0.75rem" }}>
                    <input type="hidden" name="engagementId" value={detail.engagement.id} />
                    <input type="hidden" name="scenarioRunId" value={row.id} />
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
                    <button className="button-secondary" type="submit">
                      Save scenario review
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="kicker">Findings and report</div>
          <h3>Open findings</h3>
          {findingRows.length === 0 ? (
            <div className="empty-state">
              No findings yet. Failed scenarios will promote into structured remediation items.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {findingRows.map((finding) => (
                <article key={finding.id} className="panel">
                  <strong className={`severity-${finding.severity}`}>{finding.title}</strong>
                  <p className="muted">{finding.summary}</p>
                  <p>{finding.remediation}</p>
                  <div className="kicker">{titleCase(finding.status)}</div>
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: "1rem" }}>
            <h3>Latest report</h3>
            {latestReport ? (
              <div className="panel">
                <p>{latestReport.executiveSummary}</p>
                <div className="pill-row">
                  <span className="pill">v{latestReport.version}</span>
                  <span className="pill">Readiness {latestReport.readinessScore}/100</span>
                  <span className="pill">{latestReport.status}</span>
                </div>
                <div className="actions">
                  <Link className="button-secondary" href={`/api/reports/${latestReport.id}/pdf`}>
                    Download PDF
                  </Link>
                  {founderView ? (
                    <form action={publishReportAction}>
                      <input type="hidden" name="reportId" value={latestReport.id} />
                      <input type="hidden" name="engagementId" value={detail.engagement.id} />
                      <button className="button-primary" type="submit">
                        Publish report
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                {founderView ? "No report drafted yet." : "No published report is available yet."}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid-two">
        {founderView ? (
          <section className="panel">
            <div className="kicker">Automation and queue</div>
            <h3>Job history</h3>
            {jobRows.length === 0 ? (
              <div className="empty-state">No queued jobs have been recorded for this engagement.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {jobRows.map((job) => (
                  <article key={job.id} className="panel">
                    <strong>{titleCase(job.name)}</strong>
                    <p className="muted">
                      {titleCase(job.status)} / Updated {formatDate(job.updatedAt)}
                    </p>
                    {job.queueId ? <p className="muted">Queue ID: {job.queueId}</p> : null}
                    {job.error ? <p style={{ color: "var(--danger)" }}>{job.error}</p> : null}
                    {job.completedAt ? <p className="muted">Completed {formatDate(job.completedAt)}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="panel">
            <div className="kicker">Engagement status</div>
            <h3>Customer-safe scope</h3>
            <div className="empty-state">
              Internal automation status, queue metadata, and processing errors remain hidden from customer contacts.
            </div>
          </section>
        )}

        <section className="panel">
          <div className="kicker">Message thread</div>
          <h3>Customer-safe updates</h3>
          <form action={addMessageAction} style={{ display: "grid", gap: "0.75rem" }}>
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
            <button className="button-secondary" type="submit">
              Add update
            </button>
          </form>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {messageRows.length === 0 ? (
              <div className="empty-state">No messages yet.</div>
            ) : (
              messageRows.map((message) => (
                <article key={message.id} className="panel">
                  <strong>{message.authorName}</strong>
                  <p className="muted">
                    {message.visibility} / {formatDate(message.createdAt)}
                  </p>
                  <p>{message.body}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid-two">
        <section className="panel">
          <div className="kicker">Artifacts</div>
          <h3>Evidence and uploads</h3>
          <form action={uploadAttachmentAction} style={{ display: "grid", gap: "0.75rem" }}>
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
              <input id="file" name="file" type="file" />
            </div>
            <button className="button-secondary" type="submit">
              Upload
            </button>
          </form>
          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
            {attachmentRows.length === 0 ? (
              <div className="empty-state">No attachments yet.</div>
            ) : (
              attachmentRows.map((attachment) => (
                <article key={attachment.id} className="panel">
                  <strong>{attachment.fileName}</strong>
                  <p className="muted">
                    {attachment.visibility} / {attachment.size} bytes / {formatDate(attachment.createdAt)}
                  </p>
                  <Link href={`/api/attachments/${attachment.id}`}>Download</Link>
                </article>
              ))
            )}
          </div>
        </section>

        {founderView ? (
          <>
            <InviteForm engagementId={detail.engagement.id} />
            <section className="panel">
              <div className="kicker">Pending invites</div>
              <h3>Customer contacts not yet activated</h3>
              {openInvites.length === 0 ? (
                <div className="empty-state">No pending invites for this engagement.</div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {openInvites.map((invite: { id: string; name: string; email: string; createdAt: string }) => (
                    <article key={invite.id} className="panel">
                      <strong>{invite.name}</strong>
                      <p className="muted">{invite.email}</p>
                      <p className="muted">Issued {formatDate(invite.createdAt)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="panel">
            <div className="kicker">Portal access</div>
            <h3>Customer scope</h3>
            <div className="empty-state">
              Internal notes, draft reports, and internal-only artifacts remain hidden from invited customer contacts.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
