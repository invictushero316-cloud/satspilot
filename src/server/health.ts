/**
 * Server-only health payload. Keep secrets out of this response.
 */
export type HealthStatus = {
  status: "ok";
  service: "satspilot";
  timestamp: string;
};

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "satspilot",
    timestamp: new Date().toISOString(),
  };
}
