"use client";

import Link from "next/link";

import { IconAlert } from "@/components/icons";
import { useLocale } from "@/lib/i18n/locale-context";

export function ServiceOutageBanner({
  kind,
}: {
  kind: "wallet" | "ai" | "both";
}) {
  const { dictionary } = useLocale();
  const message =
    kind === "wallet"
      ? dictionary.reliability.walletOutage
      : kind === "ai"
        ? dictionary.reliability.aiOutage
        : dictionary.reliability.bothOutage;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
    >
      <IconAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p>{message}</p>
        <p>
          <Link
            href="/sales/new"
            className="font-medium underline underline-offset-2"
          >
            {dictionary.reliability.useBookkeeping}
          </Link>
        </p>
      </div>
    </div>
  );
}
