import { PrismaClient } from "@prisma/client";

import { ensureDatabaseReachable } from "@/server/db/reachability";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

function createPrisma() {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  // Preflight TCP before every query — prevents Windows Prisma engine process death
  // when Postgres is unreachable (ACCESS_VIOLATION / ECONNRESET of the Next server).
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        await ensureDatabaseReachable();
        return query(args);
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export type AppPrisma = typeof prisma;
