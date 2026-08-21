import { execSync } from "node:child_process";
import { resolve } from "node:path";

// Postgres now, so there's no file to delete - the suite resets the schema
// instead. `migrate reset --force` drops everything and replays the
// migrations: exactly right against a throwaway database, catastrophic
// against a real one.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/stockpulse_test";

// Hard stop if the target isn't local. Without this, a stray DATABASE_URL in
// the environment is all it would take for `npm test` to drop the production
// database - a failure that's total, irreversible, and silent until someone
// notices the data is gone.
function assertLocal(url: string) {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`TEST_DATABASE_URL is not a valid URL: ${url}`);
  }

  const localHosts = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal", "postgres", "db"];
  if (!localHosts.includes(host)) {
    throw new Error(
      `Refusing to run tests against a non-local database (host: ${host}).\n` +
        `The suite drops and recreates the schema. Point TEST_DATABASE_URL at a local Postgres.`
    );
  }
}

export async function setup() {
  assertLocal(TEST_DATABASE_URL);

  // Prisma 7 dropped --skip-generate/--skip-seed from this command, and it
  // refuses to reset a database when it detects an AI agent invoked it unless
  // consent is passed explicitly. Tests have to run unattended (CI included),
  // so the consent lives here - and assertLocal() above is what makes that
  // safe: this can only ever fire against a local throwaway database.
  execSync("npx prisma migrate reset --force", {
    cwd: resolve(__dirname, "../.."),
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "Yes, proceed",
    },
    stdio: "inherit",
  });
}

export async function teardown() {
  // Nothing to clean up: the next run resets the schema before it starts, and
  // leaving the data behind makes a failed run easier to inspect.
}
