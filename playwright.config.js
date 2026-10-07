import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
import { basename } from "node:path";
const browserPath =
  process.env.TEST_BROWSER_PATH ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const root = basename(process.cwd());
export default defineConfig({
  testDir: "./browser-tests",
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  use: {
    baseURL: `http://127.0.0.1:3100/${root}/`,
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
    launchOptions: browserPath ? { executablePath: browserPath } : {},
  },
  webServer: {
    command: "python3 -m http.server 3100 --bind 127.0.0.1 --directory ..",
    url: `http://127.0.0.1:3100/${root}/`,
    reuseExistingServer: false,
    timeout: 10000,
    stdout: "ignore",
    stderr: "ignore",
  },
  reporter: "list",
});
