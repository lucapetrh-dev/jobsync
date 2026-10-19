import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "landing.browser.mjs",
  outputDir: "../../test-results/landing",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8788",
    javaScriptEnabled: false,
    browserName: "chromium",
  },
  webServer: {
    command: "npm --prefix deploy/landing run dev",
    cwd: new URL("../../", import.meta.url).pathname,
    url: "http://127.0.0.1:8788",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
