import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3742",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /navigation\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3742",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
