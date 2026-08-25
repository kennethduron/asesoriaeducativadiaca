import { defineConfig, devices } from "@playwright/test";

import { getLocalSupabaseEnvironment } from "./e2e/local-supabase";

const local = getLocalSupabaseEnvironment();
if (!local.API_URL || !local.ANON_KEY || !local.SERVICE_ROLE_KEY)
  throw new Error("Start Supabase local before running Playwright.");

process.env.E2E_SUPABASE_URL = local.API_URL;
process.env.E2E_SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        local.PUBLISHABLE_KEY || local.ANON_KEY,
    },
  },
});
