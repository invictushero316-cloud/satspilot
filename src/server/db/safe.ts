import { AppError } from "@/server/errors";

/** Convert Prisma/engine connection failures into controlled AppErrors (no process crash UX). */
export async function withDatabase<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      /Can't reach database|ECONNREFUSED|P1001|P1017|PrismaClientInitializationError|PrismaClientKnownRequestError|timed out/i.test(
        message,
      ) ||
      (error &&
        typeof error === "object" &&
        "name" in error &&
        String((error as { name: string }).name).includes("Prisma"))
    ) {
      throw new AppError("DB_UNAVAILABLE", "Database unavailable", 503);
    }
    throw error;
  }
}
