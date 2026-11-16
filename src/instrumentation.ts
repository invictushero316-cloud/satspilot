/**
 * Next.js instrumentation — keep process alive on unexpected Prisma/engine rejections.
 * Controlled AppErrors still flow through route handlers; this is a last-resort net.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "unknown");
      if (
        /Can't reach database|ECONNREFUSED|P1001|PrismaClientInitializationError/i.test(
          message,
        )
      ) {
        console.error("[instrumentation] swallowed DB unhandledRejection:", message);
        return;
      }
      console.error("[instrumentation] unhandledRejection:", message);
    });
  }
}
