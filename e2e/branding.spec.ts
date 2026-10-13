import { test, expect } from "./fixtures";

const routes = [
  "/dashboard", "/dashboard/myjobs", "/dashboard/interviews",
  "/dashboard/automations", "/dashboard/tasks", "/dashboard/activities",
  "/dashboard/questions", "/dashboard/profile", "/dashboard/admin", "/dashboard/settings",
];

for (const theme of ["light", "dark"] as const) {
  test(`Jobs branding and icons in ${theme} appearance`, async ({ page }) => {
    test.setTimeout(240000);
    await page.emulateMedia({ colorScheme: theme });
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveTitle(/Jobs$/);
      await expect(page.locator("body")).not.toContainText("JobSync");
      const icon = page.locator("aside img[alt='Jobs']");
      await expect(icon).toBeVisible();
      await expect(icon).toHaveAttribute("src", "/images/jobs-icon.svg");
      await expect(icon).toHaveCSS("filter", theme === "dark" ? "invert(1)" : "none");
      await expect(icon.locator("..")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect.poll(() => icon.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute("href", /apple-icon\.png/);
      const href = await page.locator("link[rel='icon'][type='image/svg+xml']").getAttribute("href");
      expect(href).toBeTruthy();
      const favicon = await page.request.get(href!);
      expect(favicon.status()).toBe(200);
      expect(favicon.headers()["content-type"]).toContain("image/svg+xml");
    }
    await page.screenshot({ path: `.implementation/jobs-desktop-${theme}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Toggle Menu" }).click();
    const navigation = page.getByRole("dialog");
    await expect(navigation.getByRole("img", { name: "Jobs" })).toBeVisible();
    await expect.poll(async () => (await navigation.boundingBox())?.x).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `.implementation/jobs-mobile-${theme}.png` });
  });
}

test("Jobs web manifest and browser icon assets are served", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("Jobs");
  expect(manifest.short_name).toBe("Jobs");
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/favicon.ico")).status()).toBe(200);
});
