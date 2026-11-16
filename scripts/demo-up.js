#!/usr/bin/env node
/**
 * Cross-platform one-command demo launcher.
 * Prefers Docker Compose; prints a clear fallback if Docker is missing.
 */
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const script = path.join(__dirname, isWin ? "demo-up.ps1" : "demo-up.sh");

if (!existsSync(script)) {
  console.error("Missing demo script:", script);
  process.exit(1);
}

const result = isWin
  ? spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script],
      { cwd: root, stdio: "inherit" },
    )
  : spawnSync("bash", [script], { cwd: root, stdio: "inherit" });

process.exit(result.status ?? 1);
