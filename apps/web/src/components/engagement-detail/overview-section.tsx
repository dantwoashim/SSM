import { generateReportAction, generateTestPlanAction } from "@/lib/actions/engagement-actions";
import { formatDate, titleCase } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export function OverviewSection({
  engagement,
  founderView,
}: {
  engagement: {
    id: string;
    title: string;
    status: string;
    targetCustomer: string;
    deadline: string | null;
    claimedFeatures: string[];
    providerValidation: {
      adapterStatus: string;
      supportStatement: string;
      warnings: string[];
    };
  };
  founderView: boolean;
}) {
  return (
    <section className="detail-section">
      <h2>{engagement.title}</h2>
      <div className="detail-meta">
        <div className="detail-meta-item">
          <span className="metric-label">Status</span>
          <strong className="status-label">{titleCase(engagement.status)}</strong>
        </div>
        <div className="detail-meta-item">
          <span className="metric-label">Target customer</span>
          <strong>{engagement.targetCustomer}</strong>
        </div>
        <div className="detail-meta-item">
          <span className="metric-label">Deadline</span>
          <strong>{formatDate(engagement.deadline)}</strong>
        </div>
      </div>
      <div className="tag-row">
        {engagement.claimedFeatures.map((feature) => (
          <span className="tag" key={feature}>
            {feature}
          </span>
        ))}
      </div>
      <div className="callout mt-md">
        <strong>Provider validation</strong>
        <p className="mt-sm">{engagement.providerValidation.supportStatement}</p>
        {engagement.providerValidation.warnings.length > 0 ? (
          <ul className="mt-sm">
            {engagement.providerValidation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {founderView ? (
        <div className="actions mt-lg">
          <form action={generateTestPlanAction}>
            <input type="hidden" name="engagementId" value={engagement.id} />
            <SubmitButton pendingLabel="Generating plan...">Generate test plan</SubmitButton>
          </form>
          <form action={generateReportAction}>
            <input type="hidden" name="engagementId" value={engagement.id} />
            <SubmitButton className="button-secondary" pendingLabel="Drafting report...">
              Draft report
            </SubmitButton>
          </form>
        </div>
      ) : (
        <p className="muted mt-md">Customer view</p>
      )}
    </section>
  );
}
