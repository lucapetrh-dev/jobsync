import { test, expect } from "@playwright/test";

for (const colorScheme of ["light", "dark"]) {
  for (const width of [1280, 390, 320]) {
    test(`static landing in ${colorScheme} appearance at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
      const requests = [];
      const errors = [];
      page.on("request", (request) => requests.push(request.url()));
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      const response = await page.goto("/?next=/dashboard&message=untrusted-query-value");
      expect(response.status()).toBe(200);
      expect(response.headers()["set-cookie"]).toBeUndefined();
      await expect(page).toHaveTitle(/Jobs/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jobs is a private workspace.");
      await expect(page.getByText("It isn’t available to the public.")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("untrusted-query-value");
      await expect(page.locator("a, button, input, form, script")).toHaveCount(0);
      await expect(page.getByRole("img", { name: "Jobs" })).toBeVisible();
      const image = await page.getByRole("img", { name: "Jobs" }).evaluate((element) => ({
        loaded: element.complete && element.naturalWidth > 0,
        selected: element.currentSrc,
        light: element.src,
        dark: element.parentElement.querySelector("source").srcset,
      }));
      expect(image.loaded).toBe(true);
      expect(image.selected).toBe(colorScheme === "dark" ? image.dark : image.light);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.fonts.check("16px Geist"))).toBe(true);
      await expect(page.locator("body")).toHaveCSS("background-color", colorScheme === "dark" ? "rgb(16, 16, 16)" : "rgb(247, 247, 247)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(requests.filter((url) => url.startsWith("http"))).toHaveLength(1);
      expect(errors).toEqual([]);
      await page.screenshot({ path: test.info().outputPath("page.png"), fullPage: true });
    });
  }
}

test("the message stays readable with text enlarged to 200%", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("It isn’t available to the public.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: test.info().outputPath("text-200-percent.png"), fullPage: true });
});
