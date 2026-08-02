import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const BACKEND_ROOT = resolve(__dirname, "../..");
const TEST_DB_PATH = resolve(BACKEND_ROOT, "prisma/test.db");
const TEST_DATABASE_URL = "file:./prisma/test.db";

function removeIfExists(path: string) {
  if (existsSync(path)) unlinkSync(path);
}

export async function setup() {
  removeIfExists(TEST_DB_PATH);
  removeIfExists(`${TEST_DB_PATH}-journal`);

  execSync("npx prisma migrate deploy", {
    cwd: BACKEND_ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}

export async function teardown() {
  removeIfExists(TEST_DB_PATH);
  removeIfExists(`${TEST_DB_PATH}-journal`);
}
