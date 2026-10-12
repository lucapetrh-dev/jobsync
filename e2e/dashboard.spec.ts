import { test, expect, createNewJob, uniqueName } from "./fixtures";

async function dashboard(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

test.describe("Dashboard page", () => {
  test("shows a new application, the CV card, and the activity calendar", async ({ page, cleanup }) => {
    const title = uniqueName("dashboard application");
    await createNewJob(page, title, cleanup, {
      beforeSave: async (page) => {
        await page.getByLabel("Select Job Status").click();
        await page.getByRole("option", { name: "Applied", exact: true }).click();
      },
    });
    await dashboard(page);
    await expect(page.getByRole("heading", { name: "Recent applications" })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CV analysis" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Activity Calendar" })).toBeVisible();
    await page.getByLabel("Select year").click();
    await expect(page.getByRole("option", { name: String(new Date().getFullYear()), exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "View all", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/myjobs/);
  });

  test("retains the Add Job and More creation shortcuts", async ({ page }) => {
    await page.getByRole("button", { name: "Add Job", exact: true }).click();
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    for (const [label, route, title] of [
      ["Add Task", "tasks", "task-form-dialog-title"],
      ["Add Question", "questions", "question-form-dialog-title"],
    ]) {
      await dashboard(page);
      await page.getByRole("button", { name: "More", exact: true }).click();
      await page.getByRole("menuitem", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/dashboard/${route}`));
      await expect(page.getByTestId(title)).toBeVisible();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    await dashboard(page);
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add Automation", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/automations/);
    await expect(page.getByRole("dialog").getByText("Step 1 of 6")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  });

  test("opens the contact dialog after closing More", async ({ page }) => {
    await page.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add Contact", exact: true }).click();
    await expect(page.getByRole("menu")).not.toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true })).toBeEnabled();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("links the CV card to its existing Profile flow", async ({ page }) => {
    const link = page.getByRole("link", { name: /^Open (in )?Profile$/ });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/^\/dashboard\/profile/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    if (href!.includes("#cv-review")) {
      await expect(page.locator("#cv-review")).toBeVisible();
    }
  });

  test("keeps dashboard cards usable with the docked assistant", async ({ page }) => {
    await page.getByRole("button", { name: "Open assistant", exact: true }).click();
    await expect(page.getByRole("button", { name: "Close chat", exact: true })).toBeVisible();
    const main = page.locator("#main-content");
    await expect(main.getByRole("heading", { name: "Recent applications" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "CV analysis" })).toBeVisible();
    expect(await main.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "Close chat", exact: true }).click();
  });

  test("fits mobile width and retains menu navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("heading", { name: "Recent applications" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Toggle Menu", exact: true }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Profile", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});
