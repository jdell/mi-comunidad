import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: the connection URL lives here, not in schema.prisma.
// The CLI (migrate, studio) uses the direct/session connection; the runtime
// client uses DATABASE_URL (pooled) through @prisma/adapter-pg (see src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
