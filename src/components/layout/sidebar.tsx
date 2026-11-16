"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavGlyph } from "@/components/icons";
import { useLocale } from "@/lib/i18n/locale-context";
import { merchantNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { translate, dictionary } = useLocale();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/80 bg-white/90 backdrop-blur-md md:flex md:flex-col">
      <div className="border-b border-border/80 px-4 py-5">
        <p className="text-lg font-semibold tracking-tight text-navy">
          {dictionary.appName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Merchant console</p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-2.5">
        {merchantNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "pressable flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                active
                  ? "bg-navy text-white shadow-sm"
                  : "text-navy/80 hover:bg-navy-soft/80",
              )}
            >
              <NavGlyph name={item.icon} className="size-4 shrink-0" />
              {translate(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
