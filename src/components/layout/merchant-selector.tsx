"use client";

import { IconChevronDown } from "@/components/icons";
import type { Merchant } from "@/data/types";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export function MerchantSelector({
  merchants,
  activeId,
  onChange,
  className,
}: {
  merchants: Merchant[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const { dictionary } = useLocale();

  return (
    <label className={cn("relative block min-w-0", className)}>
      <span className="sr-only">{dictionary.header.selectMerchant}</span>
      <select
        className="h-9 w-full max-w-[14rem] appearance-none truncate rounded-lg border border-border bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/25"
        value={activeId}
        onChange={(event) => onChange(event.target.value)}
      >
        {merchants.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </label>
  );
}
