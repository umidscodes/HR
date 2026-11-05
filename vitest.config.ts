import { defineConfig } from "vitest/config";
import path from "node:path";

const port = process.env.DB_PORT ?? "5434";

export default defineConfig({
  root: __dirname,
  test: {
    // An explicit test directory: plain "tests/**" globs can find no files on Windows runners.
    dir: path.resolve(__dirname, "tests"),
    include: ["**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
    env: {
      DATABASE_URL: `postgres://hr_app:hr_app@localhost:${port}/icehr_test`,
      ICEHR_TEST_ADMIN_URL: `postgres://postgres:postgres@localhost:${port}/icehr_test`,
      ICEHR_QUIET_LOGS: "true",
    },
  },
});
