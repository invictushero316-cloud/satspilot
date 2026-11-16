import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-navy">You are offline</h1>
      <p className="text-sm text-muted-foreground">
        SatsPilot cannot reach the server. Cash bookkeeping drafts stay on this
        device until you reconnect — Lightning status and AI need the network.
      </p>
      <p className="text-sm text-muted-foreground">
        Unconfirmed payments are never shown as paid while offline.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg bg-navy px-4 text-sm font-medium text-white"
      >
        Try again
      </Link>
    </main>
  );
}
