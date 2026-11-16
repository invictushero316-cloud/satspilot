import { NextResponse } from "next/server";

import { AppError } from "@/server/errors";
import { redactSecrets } from "@/server/crypto/wallet-secrets";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(redactSecrets(data), {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function jsonFromError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("[api]", error instanceof Error ? error.message : "unknown");
  return NextResponse.json(
    { error: "INTERNAL", message: "Unexpected server error" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
