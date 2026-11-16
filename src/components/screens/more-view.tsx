"use client";

import Link from "next/link";

import { NavGlyph } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import type { Merchant } from "@/data/types";
import { useLocale } from "@/lib/i18n/locale-context";
import { mobileMoreNav } from "@/lib/navigation";

export function MoreView({
  merchants,
  activeMerchantId,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
}) {
  const { translate, dictionary } = useLocale();

  return (
    <AppShell
      titleKey="nav.more"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card className="divide-y divide-border p-0">
        {mobileMoreNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-navy hover:bg-surface-muted"
          >
            <NavGlyph
              name={item.icon}
              className="size-5 text-muted-foreground"
            />
            {translate(item.key)}
          </Link>
        ))}
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">
        {dictionary.appName}
      </p>
    </AppShell>
  );
}
