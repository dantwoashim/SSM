# Incident Response Runbook

## Trigger conditions

- Unauthorized access to the portal
- Unexpected exposure of artifacts or reports
- Integrity issue in report generation
- Prolonged outage affecting a live Deal Rescue engagement

## Immediate steps

1. Freeze new uploads and report publication if data exposure is suspected.
2. Preserve logs, audit records, and relevant artifacts.
3. Assess blast radius by engagement, user, and artifact key.
4. Notify impacted customers with known facts, current mitigation, and next update time.
5. Rotate affected secrets, tokens, or storage credentials.

## Post-incident

1. Record root cause and timeline.
2. Close detection or control gaps.
3. Update runbooks and customer-safe language.
