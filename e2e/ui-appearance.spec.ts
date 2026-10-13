import { test, expect } from "./fixtures";

const routes = [
  "/dashboard", "/dashboard/myjobs", "/dashboard/interviews",
  "/dashboard/automations", "/dashboard/tasks", "/dashboard/activities",
  "/dashboard/questions", "/dashboard/profile", "/dashboard/admin", "/dashboard/settings",
];

for (const theme of ["light", "dark"] as const) {
  test(`shared appearance and layout in ${theme} mode`, async ({ page }) => {
    test.setTimeout(240000);
    await page.emulateMedia({ colorScheme: theme });
    for (const route of routes) {
      await page.goto(route);
      const main = page.locator("#main-content");
      await expect(main).toBeVisible();
      await expect(main.getByRole("heading").first()).toBeVisible();
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/);
      expect(await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/geist/i);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.goto("/dashboard");
    await page.screenshot({ path: `.implementation/dashboard-${theme}.png`, fullPage: true });
  });
}

test("contact notes retain a visible keyboard focus indicator", async ({ page }) => {
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("menuitem", { name: "Add Contact", exact: true }).click();
  const notes = page.getByPlaceholder("How you met, what to follow up on...");
  await notes.focus();
  expect(await notes.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  expect(await notes.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe("2px");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
});
