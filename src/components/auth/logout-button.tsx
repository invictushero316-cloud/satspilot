"use client";

import { logoutAction } from "@/server/actions/auth";

export function LogoutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface-muted hover:text-navy"
      >
        {label}
      </button>
    </form>
  );
}
