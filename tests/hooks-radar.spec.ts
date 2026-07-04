import { expect, test } from "@playwright/test";
import { hooks } from "../lib/hooks";

const localHomePathMarker = `/${"Users"}/`;
const publicMarkdownSectionHeadings = ["Why It Works", "Public Examples", "Reference Videos", "Notes"];
const privateOnlyMarkers = [
  "George-Native Examples",
  "Private Notes",
  "Private Context",
  "George Drafts",
  "Internal Notes",
  "Local archive or transcript note",
  "private transcript archive",
  "private archive",
  "georgerepo/",
  localHomePathMarker,
];

test.describe("Hooks Radar catalog", () => {
  test("generated public data follows the public export contract", () => {
    for (const hook of hooks) {
      const publicText = [
        hook.name,
        hook.formula,
        hook.firstFrame,
        hook.onScreenText,
        hook.twistPayoff,
        hook.sourceBasis,
        hook.sourceUrl,
        hook.examples.join("\n"),
        hook.markdown,
      ].join("\n");
      const normalizedPublicText = publicText.toLowerCase();

      for (const marker of privateOnlyMarkers) {
        expect(normalizedPublicText).not.toContain(marker.toLowerCase());
      }

      const headings = [...hook.markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
      for (const heading of headings) {
        expect(publicMarkdownSectionHeadings).toContain(heading);
      }
    }
  });

  test("catalog filters, selected panel, and install command work", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.route("**/api/leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto("/");

    await expect(page).toHaveTitle("Hooks Radar");
    await expect(page.getByRole("link", { name: "Hooks Radar home" })).toBeVisible();
    await expect(page.getByPlaceholder("Search hook patterns, examples, or use cases...")).toBeVisible();
    await expect(page.getByText("Recommended today")).toBeVisible();
    await expect(page.getByText(`${hooks.length} total public-ready patterns`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock install command" })).toBeVisible();
    await expect(page.getByText("npx skills add georgewangyu/hooksradar")).toBeHidden();

    await page.getByLabel("Name").fill("Example User");
    await page.getByLabel("Email").fill("person@example.com");
    await page.locator(".unlock-form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
    await expect(page.getByRole("link", { name: "Star the repo" })).toHaveAttribute(
      "href",
      "https://github.com/georgewangyu/hooksradar",
    );
    await page.getByRole("button", { name: "Copy command" }).click();
    await expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "npx skills add georgewangyu/hooksradar --skill hooks-radar -g",
    );

    await page.getByPlaceholder("Search hook patterns, examples, or use cases...").fill("production reality");
    await expect(
      page.getByLabel("Hook catalog").getByRole("heading", {
        name: "AI Demo Meets Production Reality",
      }),
    ).toBeVisible();
    await expect(page.getByText("1 matching hooks")).toBeVisible();

    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByLabel("Hook filters").getByLabel("Source Strength").selectOption("source-observed");
    await expect(page.locator(".pill.source-observed").first()).toBeVisible();
  });

  test("copy formula and detail pages work", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");

    await page.getByRole("button", { name: /Copy Hidden Cost Reversal/i }).click();
    await expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Everyone tells you");

    await page.getByRole("button", { name: /Everyone tells you/ }).click();
    await expect(
      page.getByLabel("Selected hook pattern").getByRole("heading", {
        name: "Hidden Cost Reversal",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Open" }).click();
    await expect(page).toHaveURL(/\/hooks\/hidden-cost-reversal$/);
    await expect(page.getByRole("heading", { name: "Copyable Markdown" })).toBeVisible();
  });

  test("pagination moves through hooks and resets for search", async ({ page }) => {
    const pageSize = 12;
    const secondPageEnd = Math.min(pageSize * 2, hooks.length);

    await page.goto("/");

    await expect(page.getByText(`Page 1 of ${Math.ceil(hooks.length / pageSize)}`)).toBeVisible();
    await expect(page.getByText(`showing 1-${pageSize}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Page 2 of")).toBeVisible();
    await expect(page.getByText(`showing ${pageSize + 1}-${secondPageEnd}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeEnabled();

    await page.getByPlaceholder("Search hook patterns, examples, or use cases...").fill("production reality");
    await expect(page.getByText("1 matching hooks")).toBeVisible();
    await expect(page.getByText("Page 1 of")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);
  });

  test("bottom request form routes public and private submissions", async ({ page }) => {
    const payloads: Record<string, unknown>[] = [];
    await page.route("**/api/submit", async (route) => {
      payloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, issueNumber: 123 }),
      });
    });

    await page.goto("/");
    await page.getByRole("radio", { name: "Request pattern" }).check();
    await page.getByRole("radio", { name: "Private note" }).check();
    await page.getByLabel("Title").fill("New short-form hook source");
    await page
      .getByLabel("Why this belongs")
      .fill("This source has a repeatable first-frame pattern worth tracking.");
    await page
      .getByLabel("Rough note")
      .fill("The clip opens with a false assumption, then reverses it with a concrete example.");
    await page.getByLabel("Link or source").fill("https://example.com/hook-source");
    await page.getByLabel("Your handle").fill("@example");
    await page.locator(".submit-form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });

    await expect(page.getByText("Request sent for review.")).toBeVisible();
    expect(payloads[0]).toMatchObject({
      submissionType: "request-pattern",
      visibility: "private",
      title: "New short-form hook source",
      context: "https://example.com/hook-source",
      handle: "@example",
      website: "",
    });
  });

  test("mobile layout keeps primary controls visible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");

    await expect(page.getByText("Hooks Radar").first()).toBeVisible();
    await expect(page.getByPlaceholder("Search hook patterns, examples, or use cases...")).toBeVisible();
    await expect(page.getByText("Selected Pattern")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Send a hook pattern or source." })).toBeVisible();
  });

  test("lead gate shows validation errors before revealing the command", async ({ page }) => {
    await page.route("**/api/leads", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid lead.",
          issues: { email: ["Enter a valid email."] },
        }),
      });
    });
    await page.goto("/");

    await page.getByLabel("Name").fill("Example User");
    await page.getByLabel("Email").fill("person@example");
    await page.locator(".unlock-form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });

    await expect(page.getByText("Email: Enter a valid email.")).toBeVisible();
    await expect(page.getByText("npx skills add georgewangyu/hooksradar")).toBeHidden();
  });

  test("weekly feed page renders copyable markdown", async ({ page }) => {
    await page.goto("/feeds/2026-06-27");

    await expect(page).toHaveTitle("2026-06-27 | Hooks Radar");
    await expect(
      page.getByRole("heading", { name: "Hooks Radar Weekly Feed - 2026-06-27", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Copyable Feed Markdown", level: 2 })).toBeVisible();
    await expect(page.locator(".markdown-box")).toContainText("## Featured Hooks");
  });
});
