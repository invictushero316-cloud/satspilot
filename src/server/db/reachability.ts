import net from "node:net";

import { AppError } from "@/server/errors";

let lastOkAt = 0;
let lastFailAt = 0;

function parseDbHostPort(databaseUrl: string): { host: string; port: number } {
  // postgres://user:pass@host:5432/db — URL parser handles most forms.
  const normalized = databaseUrl.replace(/^postgresql:/i, "postgres:");
  const parsed = new URL(normalized);
  return {
    host: parsed.hostname || "127.0.0.1",
    port: Number(parsed.port || 5432),
  };
}

function tcpReachable(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Avoid calling the Prisma query engine when Postgres is down.
 * On some Windows setups the engine ACCESS_VIOLATIONs (process death) on ECONNREFUSED.
 */
export async function ensureDatabaseReachable(): Promise<void> {
  const now = Date.now();
  if (now - lastOkAt < 5_000) return;
  if (now - lastFailAt < 2_000) {
    throw new AppError("DB_UNAVAILABLE", "Database unavailable", 503);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    lastFailAt = now;
    throw new AppError("DB_UNAVAILABLE", "DATABASE_URL is not configured", 503);
  }

  let host: string;
  let port: number;
  try {
    ({ host, port } = parseDbHostPort(databaseUrl));
  } catch {
    lastFailAt = now;
    throw new AppError("DB_UNAVAILABLE", "Invalid DATABASE_URL", 503);
  }

  const ok = await tcpReachable(host, port, 400);
  if (!ok) {
    lastFailAt = Date.now();
    throw new AppError("DB_UNAVAILABLE", "Database unavailable", 503);
  }
  lastOkAt = Date.now();
}

/** Test helper — reset cached reachability. */
export function resetDatabaseReachabilityCache() {
  lastOkAt = 0;
  lastFailAt = 0;
}
