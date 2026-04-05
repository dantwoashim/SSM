import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Intake and qualification",
    items: [
      "Capture deal stage, target customer, deadline, target IdP, and claimed identity support.",
      "Verify ACV potential, urgency, and staging access before converting to an engagement.",
    ],
  },
  {
    title: "Default test plan",
    items: [
      "Generate a provider-aware scenario plan from the customer\u0027s required flows.",
      "Allow manual additions for buyer-specific edge cases.",
    ],
  },
  {
    title: "Execution and triage",
    items: [
      "Track scenario outcomes, evidence, and reviewer notes.",
      "Promote failed scenarios into structured findings with remediation language.",
    ],
  },
  {
    title: "Assurance report and retest",
    items: [
      "Produce a reusable report snapshot and downloadable PDF.",
      "Re-run changed scenarios and preserve the customer-safe artifact trail.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        label="How it works"
        title="Lead -> Qualification -> Engagement -> Report."
        description="The product is optimized for founder-led delivery first. Manual work is tracked, structured, and easy to automate later."
      />
      <ol className="numbered-steps">
        {steps.map((step) => (
          <li key={step.title} className="step-item">
            <div>
              <h3>{step.title}</h3>
              <ul className="bullet-list mt-sm">
                {step.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
