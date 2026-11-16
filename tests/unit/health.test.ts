import { describe, expect, it } from "vitest";

import { getHealthStatus } from "@/server/health";

describe("getHealthStatus", () => {
  it("returns ok without secrets", () => {
    const health = getHealthStatus();
    expect(health.status).toBe("ok");
    expect(health.service).toBe("satspilot");
    expect(JSON.stringify(health)).not.toMatch(/secret|key|nwc|password/i);
  });
});
