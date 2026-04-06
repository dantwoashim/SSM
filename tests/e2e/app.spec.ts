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
    page.waitForURL(/inviteUrl=/),
    page.getByRole("button", { name: "Create invite" }).click(),
  ]);
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
