import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { env } from "./env";

// Prisma 7 takes a driver adapter rather than reading a connection string out
// of the schema. The URL still comes from DATABASE_URL via env.ts, so the test
// harness pointing at a throwaway database works exactly as before.
const adapter = new PrismaBetterSqlite3({ url: env.databaseUrl });

// One client for the whole process — avoids exhausting SQLite connections
// when tsx watch reloads modules during development.
export const prisma = new PrismaClient({ adapter });
