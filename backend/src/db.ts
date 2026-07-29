import { PrismaClient } from "@prisma/client";

// One client for the whole process — avoids exhausting SQLite connections
// when tsx watch reloads modules during development.
export const prisma = new PrismaClient();
