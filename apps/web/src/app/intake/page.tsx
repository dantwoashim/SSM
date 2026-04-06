import { submitLeadAndRedirectAction } from "@/lib/actions/public-actions";
import { ClaimedFeatureSelector } from "@/components/claimed-feature-selector";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; warning?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const success = resolvedParams?.success === "1";

  return (
    <>
      <PageHeader
        label="Request assurance"
        title="Tell us about the deal and the deadline."
        description="We review intake submissions within one business day and follow up to confirm scope and staging access."
      />
      <form action={submitLeadAndRedirectAction} className="form-shell">
        <div className="visually-hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="companyName">Company</label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactName">Your name</label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactEmail">Email</label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="jane@acme.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="productUrl">Product URL</label>
            <input
              id="productUrl"
              name="productUrl"
              type="url"
              placeholder="https://app.acme.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="targetCustomer">Target customer</label>
            <input
              id="targetCustomer"
              name="targetCustomer"
              type="text"
              placeholder="Northwind Financial"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="targetIdp">Identity provider</label>
            <select id="targetIdp" name="targetIdp" defaultValue="" required>
              <option value="" disabled>
                Choose provider
              </option>
              <option value="okta">Okta</option>
              <option value="entra">Microsoft Entra</option>
              <option value="google-workspace">Google Workspace</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="dealStage">Deal stage</label>
            <select id="dealStage" name="dealStage" defaultValue="" required>
              <option value="" disabled>
                Choose stage
              </option>
              <option value="security_review">Security review</option>
              <option value="pilot">Pilot</option>
              <option value="negotiation">Negotiation</option>
              <option value="contract_pending">Contract pending</option>
              <option value="live_customer">Live customer</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="stagingAccessMethod">Staging access method</label>
            <input
              id="stagingAccessMethod"
              name="stagingAccessMethod"
              type="text"
              placeholder="Shared staging workspace with admin test account"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="timeline">Timeline</label>
            <input
              id="timeline"
              name="timeline"
              type="text"
              placeholder="Security review Thursday, pilot kickoff next Monday"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="deadline">Decision deadline</label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              required
            />
          </div>
          <div className="field-wide">
            <ClaimedFeatureSelector
              fieldName="requiredFlows"
              legend="Claimed / required flows"
            />
          </div>
          <div className="field-wide">
            <label htmlFor="authNotes">Additional context</label>
            <textarea
              id="authNotes"
              name="authNotes"
              placeholder="Describe the current identity architecture, known blockers, and anything buyer-specific we should know."
            />
          </div>
        </div>
        {resolvedParams?.error ? (
          <p className="error-message">{resolvedParams.error}</p>
        ) : null}
        {success ? (
          <>
            <p className="success-message">
              Intake received. We will review it and follow up within one business day.
            </p>
            {resolvedParams?.warning ? <p className="muted">{resolvedParams.warning}</p> : null}
          </>
        ) : null}
        <button type="submit" className="button-primary">
          Submit intake request
        </button>
      </form>
    </>
  );
}
