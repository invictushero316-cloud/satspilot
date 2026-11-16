"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavGlyph } from "@/components/icons";
import { useLocale } from "@/lib/i18n/locale-context";
import { mobilePrimaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { translate } = useLocale();

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px 24px_rgb(11_31_58/0.04)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {mobilePrimaryNav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "pressable relative flex flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium",
                  active ? "text-navy" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-navy animate-fade-in"
                    aria-hidden
                  />
                ) : null}
                <NavGlyph
                  name={item.icon}
                  className={cn(
                    "size-5 transition-transform duration-200",
                    active && "scale-110 text-navy",
                  )}
                />
                <span className="truncate">{translate(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
