import { redirect } from "next/navigation";
import { submitLeadAction } from "@/lib/actions/public-actions";
import { PageHeader } from "@/components/page-header";

export default function IntakePage() {
  async function action(formData: FormData) {
    "use server";
    const result = await submitLeadAction(formData);
    redirect(`/intake?submitted=${result.leadId}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Request Deal Rescue"
        title="Send the live enterprise requirement. Get the readiness gap before the buyer does."
        description="This intake is optimized for one named deal, one target customer, and one urgent deadline."
      />
      <form className="panel form-shell" action={action}>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input id="companyName" name="companyName" required />
          </div>
          <div className="field">
            <label htmlFor="contactName">Contact name</label>
            <input id="contactName" name="contactName" required />
          </div>
          <div className="field">
            <label htmlFor="contactEmail">Contact email</label>
            <input id="contactEmail" name="contactEmail" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="productUrl">Product URL</label>
            <input id="productUrl" name="productUrl" type="url" required />
          </div>
          <div className="field">
            <label htmlFor="dealStage">Deal stage</label>
            <input id="dealStage" name="dealStage" placeholder="Pilot, security review, procurement..." required />
          </div>
          <div className="field">
            <label htmlFor="targetCustomer">Target customer</label>
            <input id="targetCustomer" name="targetCustomer" required />
          </div>
          <div className="field">
            <label htmlFor="targetIdp">Primary IdP</label>
            <select id="targetIdp" name="targetIdp" defaultValue="entra">
              <option value="entra">Microsoft Entra</option>
              <option value="okta">Okta</option>
              <option value="google-workspace">Google Workspace</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="stagingAccessMethod">Staging access method</label>
            <input id="stagingAccessMethod" name="stagingAccessMethod" required />
          </div>
          <div className="field">
            <label htmlFor="timeline">Timeline</label>
            <input id="timeline" name="timeline" placeholder="Need report by Friday" required />
          </div>
          <div className="field">
            <label htmlFor="deadline">Customer-facing deadline</label>
            <input id="deadline" name="deadline" type="date" required />
          </div>
          <div className="field-wide">
            <label htmlFor="requiredFlows">Required flows</label>
            <input
              id="requiredFlows"
              name="requiredFlows"
              placeholder="Comma-separated, e.g. sp-initiated-sso, scim-create, scim-deactivate"
              required
            />
          </div>
          <div className="field-wide">
            <label htmlFor="authNotes">Identity architecture notes</label>
            <textarea id="authNotes" name="authNotes" />
          </div>
        </div>
        <div className="actions">
          <button className="button-primary" type="submit">
            Submit intake
          </button>
        </div>
      </form>
    </>
  );
}
