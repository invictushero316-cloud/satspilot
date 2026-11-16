"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { MerchantSelector } from "@/components/layout/merchant-selector";
import type { Merchant } from "@/data/types";
import { useLocale } from "@/lib/i18n/locale-context";

export function AppHeader({
  title,
  merchants,
  activeMerchantId,
  onMerchantChange,
}: {
  title: string;
  merchants: Merchant[];
  activeMerchantId: string;
  onMerchantChange: (id: string) => void;
}) {
  const { dictionary } = useLocale();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-white/85 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {dictionary.appName}
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-navy sm:text-xl">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MerchantSelector
            merchants={merchants}
            activeId={activeMerchantId}
            onChange={onMerchantChange}
          />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
