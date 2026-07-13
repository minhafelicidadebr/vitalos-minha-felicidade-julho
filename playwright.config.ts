import { defineConfig, devices } from "@playwright/test";

// E2E + a11y automatizada (Onda 0 do PLANO_ELEVACAO_180_VITALOS_2026-07-13.md).
// `webServer` sobe o próprio `bun run dev` — sem depender do preview_start
// do Claude Code, então `bunx playwright test` roda igual em CI e local.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4319",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev -- --port 4319 --strictPort",
    url: "http://localhost:4319",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
