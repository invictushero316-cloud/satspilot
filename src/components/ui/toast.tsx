"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { IconCheck, IconX } from "@/components/icons";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-3 md:bottom-6"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm shadow-[var(--shadow-soft)] animate-toast-in backdrop-blur-sm",
              item.tone === "success" &&
                "border-success/20 bg-white/95 text-success",
              item.tone === "danger" && "border-danger/20 bg-white/95 text-danger",
              item.tone === "info" && "border-border bg-white/95 text-navy",
            )}
          >
            {item.tone === "success" ? (
              <IconCheck className="mt-0.5 size-4" />
            ) : null}
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              className="rounded p-0.5 text-muted-foreground hover:bg-surface-muted"
              onClick={() =>
                setItems((prev) => prev.filter((t) => t.id !== item.id))
              }
              aria-label="Dismiss"
            >
              <IconX className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
