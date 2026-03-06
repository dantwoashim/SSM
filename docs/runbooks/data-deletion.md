# Data Deletion Runbook

## Default process

1. Confirm the requestor is authorized for the relevant engagement.
2. Export final report artifacts if the customer requests a copy before deletion.
3. Remove attachment records and stored artifacts.
4. Remove engagement-specific messages, findings, scenario runs, test runs, and reports.
5. Preserve only the minimal billing and audit evidence required by law or contract.

## Operational note

If S3-compatible storage is enabled, delete both the object record and the corresponding database metadata.
