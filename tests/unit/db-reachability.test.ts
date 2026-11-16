import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ensureDatabaseReachable,
  resetDatabaseReachabilityCache,
} from "@/server/db/reachability";
import { AppError } from "@/server/errors";

describe("ensureDatabaseReachable", () => {
  afterEach(() => {
    resetDatabaseReachabilityCache();
    vi.unstubAllEnvs();
  });

  it("throws DB_UNAVAILABLE when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(ensureDatabaseReachable()).rejects.toMatchObject({
      code: "DB_UNAVAILABLE",
    } satisfies Partial<AppError>);
  });

  it("throws when localhost postgres port is closed", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:pass@127.0.0.1:1/satspilot",
    );
    resetDatabaseReachabilityCache();
    await expect(ensureDatabaseReachable()).rejects.toMatchObject({
      code: "DB_UNAVAILABLE",
      status: 503,
    });
  });
});
