"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";

import { DemoBanner } from "@/components/demo-banner";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import type { Merchant } from "@/data/types";
import { useLocale } from "@/lib/i18n/locale-context";

export function AppShell({
  titleKey,
  merchants,
  activeMerchantId,
  children,
}: {
  titleKey: string;
  merchants: Merchant[];
  activeMerchantId: string;
  children: ReactNode;
}) {
  const { translate } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const title = useMemo(() => translate(titleKey), [translate, titleKey]);

  function onMerchantChange(id: string) {
    router.push(`${pathname}?merchantId=${encodeURIComponent(id)}`);
  }

  return (
    <div className="flex min-h-full flex-1 app-atmosphere">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBanner />
        <AppHeader
          title={title}
          merchants={merchants}
          activeMerchantId={activeMerchantId}
          onMerchantChange={onMerchantChange}
        />
        <main
          id="app-main"
          className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-24 sm:px-4 sm:py-5 lg:px-6 md:pb-6 animate-fade-up"
          key={pathname}
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
