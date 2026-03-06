import { redirect } from "next/navigation";
import { createEngagementAction } from "@/lib/actions/engagement-actions";

export default function NewEngagementPage() {
  async function action(formData: FormData) {
    "use server";
    const engagement = await createEngagementAction(formData);
    redirect(`/app/engagements/${engagement.id}`);
  }

  return (
    <section className="panel">
      <div className="kicker">Founder-created engagement</div>
      <h2>Open a Deal Rescue engagement manually</h2>
      <form className="form-shell" action={action}>
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
        <button className="button-primary" type="submit">
          Create engagement
        </button>
      </form>
    </section>
  );
}
