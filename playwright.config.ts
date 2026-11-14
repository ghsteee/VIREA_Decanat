import { defineConfig } from "@playwright/test";

const port = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    viewport: { width: 360, height: 640 },
    timezoneId: "Europe/Moscow",
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.E2E_BROWSER_PATH },
  },
  workers: 1,
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run start -- --port ${port}`,
        url: `${baseURL}/login`,
        timeout: 120_000,
        env: { DEMO_LOGIN: "on" },
      },
});
