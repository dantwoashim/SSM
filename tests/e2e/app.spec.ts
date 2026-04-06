import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function signInAsFounder(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("StartHere123!");
  await Promise.all([
    page.waitForURL(/\/app$/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await expect(page).toHaveURL(/\/app$/);
}

test("public intake submits successfully", async ({ page }) => {
  await page.goto("/intake");
  await page.getByLabel("Company").fill("Globex");
  await page.getByLabel("Your name").fill("Jordan Example");
  await page.getByLabel("Email").fill("jordan@globex.example");
  await page.getByLabel("Product URL").fill("https://app.globex.example");
  await page.getByLabel("Target customer").fill("Initech");
  await page.getByLabel("Identity provider").selectOption("okta");
  await page.getByLabel("Deal stage").selectOption("pilot");
  await page.getByLabel("Staging access method").fill("Shared review workspace");
  await page.getByLabel("Timeline").fill("Need report this week");
  await page.getByLabel("Decision deadline").fill("2026-05-15");
  await page.getByLabel("Claimed / required flows").fill("sp-initiated-sso, scim-create");
  await page.getByLabel("Additional context").fill("Buyer wants confidence in first-run provisioning.");
  await Promise.all([
    page.waitForURL(/\/intake\?success=1/),
    page.getByRole("button", { name: "Submit intake request" }).click(),
  ]);
  await expect(page.getByText("Intake received.")).toBeVisible();
});

test("readiness reflects inline local mode during browser smoke runs", async ({ request }) => {
  const response = await request.get("/api/readyz");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    queueMode: "inline",
    storageMode: "local",
    storageReady: true,
  });
});

test("founder can create an engagement and generate a test plan", async ({ page }) => {
  await signInAsFounder(page);
  await page.goto("/app/engagements/new");
  await page.getByLabel("Engagement title").fill("Acme <> Litware Deal Rescue");
  await page.getByLabel("Company name").fill("Acme SaaS");
  await page.getByLabel("Product URL").fill("https://staging.acme.example");
  await page.getByLabel("Target customer").fill("Litware");
  await page.getByLabel("Target IdP").selectOption("entra");
  await page.getByLabel("Deadline").fill("2026-05-18");
  await page.getByLabel("Claimed features").fill("sp-initiated-sso, group-role-mapping, auditability");
  await Promise.all([
    page.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    page.getByRole("button", { name: "Create engagement" }).click(),
  ]);
  await expect(page).toHaveURL(/\/app\/engagements\/eng_[^/]+$/);
  await page.getByRole("button", { name: "Generate test plan" }).click();
  await expect(page.getByText("Default entra readiness plan")).toBeVisible();
  await expect(page.locator("strong").filter({ hasText: "SP-initiated SSO" })).toBeVisible();
});

test("founder can invite a customer, upload evidence, and the customer can sign in", async ({ page, browser, browserName }) => {
  test.skip(browserName !== "chromium", "Download assertions are only covered in the Chromium project.");

  await signInAsFounder(page);
  await page.goto("/app");
  await page.getByRole("link", { name: /Acme SaaS <> Northwind Financial Deal Rescue/i }).click();

  const filePath = path.join(process.cwd(), "tests", "e2e", "fixtures", "sample-evidence.txt");
  await page.getByLabel("Upload artifact").setInputFiles(filePath);
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("sample-evidence.txt")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page
    .locator(".activity-item")
    .filter({ hasText: "sample-evidence.txt" })
    .getByRole("link", { name: "Download" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("sample-evidence");
  await download.path();
  const engagementUrl = page.url();
  await page.goto(engagementUrl);
  await expect(page.getByRole("heading", { name: /Customer access/i })).toBeVisible();

  await page.getByLabel("Name").fill("Northwind IAM");
  await page.getByLabel("Email").fill("iam@northwind.example");
  await Promise.all([
    page.waitForURL(engagementUrl),
    page.getByRole("button", { name: "Create invite" }).click(),
  ]);
  await expect(page).not.toHaveURL(/inviteUrl=|inviteNotice=|inviteError=/);
  const inviteLink = await page.locator(".break-anywhere").last().textContent();
  expect(inviteLink).toBeTruthy();

  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto(inviteLink || "/");
  await customerPage.getByLabel("Password").fill("CustomerPass123!");
  await Promise.all([
    customerPage.waitForURL(/\/app(\/engagements\/eng_[^/]+)?$/),
    customerPage.getByRole("button", { name: "Activate account" }).click(),
  ]);
  await expect(customerPage).toHaveURL(/\/app(\/engagements\/eng_[^/]+)?$/);
  await expect(customerPage.getByText("Customer view")).toBeVisible();
  await expect(customerPage.getByRole("heading", { name: "Access scope" })).toBeVisible();
  await expect(customerPage.getByText("sample-evidence.txt")).toBeVisible();
  await customerContext.close();
});

test("existing customers can claim access to a new engagement without resetting their account", async ({ page, browser }) => {
  const returningCustomerEmail = "repeat-iam@northwind.example";
  await signInAsFounder(page);
  await page.goto("/app");
  await Promise.all([
    page.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    page.getByRole("link", { name: /Acme SaaS <> Northwind Financial Deal Rescue/i }).click(),
  ]);
  const firstEngagementUrl = page.url();
  await page.getByLabel("Name").fill("Northwind IAM");
  await page.getByLabel("Email").fill(returningCustomerEmail);
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(firstEngagementUrl);
  const firstInviteLink = await page.locator(".break-anywhere").last().textContent();
  expect(firstInviteLink).toBeTruthy();

  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto(firstInviteLink || "/");
  await customerPage.getByLabel("Password").fill("CustomerPass123!");
  await Promise.all([
    customerPage.waitForURL(/\/app(\/engagements\/eng_[^/]+)?$/),
    customerPage.getByRole("button", { name: "Activate account" }).click(),
  ]);

  await page.goto("/app/engagements/new");
  await page.getByLabel("Engagement title").fill("Acme <> Wingtip Deal Rescue");
  await page.getByLabel("Company name").fill("Acme SaaS");
  await page.getByLabel("Product URL").fill("https://staging.acme.example");
  await page.getByLabel("Target customer").fill("Wingtip");
  await page.getByLabel("Target IdP").selectOption("okta");
  await page.getByLabel("Deadline").fill("2026-05-20");
  await page.getByLabel("Claimed features").fill("sp-initiated-sso, auditability");
  await Promise.all([
    page.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    page.getByRole("button", { name: "Create engagement" }).click(),
  ]);
  const secondEngagementUrl = page.url();

  await page.getByLabel("Name").fill("Northwind IAM");
  await page.getByLabel("Email").fill(returningCustomerEmail);
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page).toHaveURL(secondEngagementUrl);
  await expect(page).not.toHaveURL(/inviteUrl=|inviteNotice=|inviteError=/);
  const secondInviteLink = await page.locator(".break-anywhere").last().textContent();
  expect(secondInviteLink).toBeTruthy();

  await customerPage.goto(secondInviteLink || "/");
  await expect(customerPage.getByRole("button", { name: "Claim access" })).toBeVisible();
  await Promise.all([
    customerPage.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    customerPage.getByRole("button", { name: "Claim access" }).click(),
  ]);
  await expect(customerPage).toHaveURL(/\/app\/engagements\/eng_[^/]+$/);
  await expect(customerPage.getByText("Customer view")).toBeVisible();
  await customerContext.close();
});

test("a passing retest resolves the seeded open finding", async ({ page }) => {
  await signInAsFounder(page);
  await page.goto("/app");
  await Promise.all([
    page.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    page.getByRole("link", { name: /Acme SaaS <> Northwind Financial Deal Rescue/i }).click(),
  ]);

  await page.getByRole("button", { name: "Generate test plan" }).click();
  await expect(page.getByRole("heading", { name: /Retest \d+ entra readiness plan/i })).toBeVisible();

  const scenarioCard = page
    .locator(".list-item")
    .filter({ has: page.locator("strong", { hasText: /Group/i }) })
    .first();

  await scenarioCard.getByLabel("Outcome").selectOption("passed");
  await scenarioCard
    .getByLabel("Reviewer notes")
    .fill("Confirmed on retest that the admin group now maps correctly.");
  await scenarioCard.getByRole("button", { name: "Save scenario review" }).click();

  await expect(page.getByText("No findings yet. Failed scenarios promote into structured remediation items.")).toBeVisible();
});

test("invalid text uploads are rejected before artifact registration", async ({ page }) => {
  await signInAsFounder(page);
  await page.goto("/app");
  await Promise.all([
    page.waitForURL(/\/app\/engagements\/eng_[^/]+$/),
    page.getByRole("link", { name: /Acme SaaS <> Northwind Financial Deal Rescue/i }).click(),
  ]);

  await page.getByLabel("Upload artifact").setInputFiles({
    name: "broken.txt",
    mimeType: "text/plain",
    buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
  });
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText(/does not look like a valid text-based artifact/i)).toBeVisible();
  await expect(page.locator(".activity-item").filter({ hasText: "broken.txt" })).toHaveCount(0);
});
