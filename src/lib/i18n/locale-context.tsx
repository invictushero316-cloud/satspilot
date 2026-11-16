"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getDictionary, t, type Dictionary } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/lib/i18n/locales";

type LocaleContextValue = {
  locale: SupportedLocale;
  dictionary: Dictionary;
  setLocale: (locale: SupportedLocale) => void;
  translate: (path: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: SupportedLocale;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const translate = useCallback(
    (path: string, fallback?: string) => t(dictionary, path, fallback),
    [dictionary],
  );

  const value = useMemo(
    () => ({ locale, dictionary, setLocale, translate }),
    [locale, dictionary, setLocale, translate],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
