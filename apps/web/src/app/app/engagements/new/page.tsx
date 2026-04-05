import { createEngagementAndRedirectAction } from "@/lib/actions/engagement-actions";
import { SubmitButton } from "@/components/submit-button";

export default async function NewEngagementPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <section>
      <h3>Open a Deal Rescue engagement manually</h3>
      <form className="form-shell" action={createEngagementAndRedirectAction}>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="title">Engagement title</label>
            <input id="title" name="title" required />
          </div>
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input id="companyName" name="companyName" required />
          </div>
          <div className="field">
            <label htmlFor="productUrl">Product URL</label>
            <input id="productUrl" name="productUrl" required />
          </div>
          <div className="field">
            <label htmlFor="targetCustomer">Target customer</label>
            <input id="targetCustomer" name="targetCustomer" required />
          </div>
          <div className="field">
            <label htmlFor="targetIdp">Target IdP</label>
            <select id="targetIdp" name="targetIdp" defaultValue="entra">
              <option value="entra">Microsoft Entra</option>
              <option value="okta">Okta</option>
              <option value="google-workspace">Google Workspace</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="deadline">Deadline</label>
            <input id="deadline" name="deadline" type="date" />
          </div>
          <div className="field-wide">
            <label htmlFor="claimedFeatures">Claimed features</label>
            <input
              id="claimedFeatures"
              name="claimedFeatures"
              placeholder="Comma-separated, e.g. sp-initiated-sso, scim-create, group-role-mapping"
              required
            />
          </div>
        </div>
        {resolvedParams?.error ? <p className="error-message">{resolvedParams.error}</p> : null}
        <SubmitButton pendingLabel="Creating engagement...">Create engagement</SubmitButton>
      </form>
    </section>
  );
}
