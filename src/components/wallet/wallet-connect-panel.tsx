"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  connectWalletAction,
  disconnectWalletAction,
  type WalletActionState,
} from "@/server/actions/wallet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/lib/i18n/locale-context";

export type WalletPanelStatus = {
  connected: boolean;
  label: string | null;
  capabilities: string[];
  includesPayInvoice: boolean;
  network: string | null;
  lud16: string | null;
  receiveOnlyRecommended: boolean;
  demoMode: boolean;
};

const initial: WalletActionState | null = null;

export function WalletConnectPanel({
  merchantId,
  initialStatus,
}: {
  merchantId: string;
  initialStatus: WalletPanelStatus;
}) {
  const { dictionary } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const uriRef = useRef<HTMLInputElement>(null);

  const [connectState, connectAction, connectPending] = useActionState(
    async (prev: WalletActionState | null, formData: FormData) => {
      const result = await connectWalletAction(prev, formData);
      if (result.ok) {
        if (uriRef.current) uriRef.current.value = "";
        push(
          result.warning
            ? dictionary.settings.walletPayWarning
            : dictionary.settings.walletConnected,
          result.warning ? "info" : "success",
        );
        router.refresh();
      }
      return result;
    },
    initial,
  );

  const [disconnectState, disconnectAction, disconnectPending] = useActionState(
    async (prev: WalletActionState | null, formData: FormData) => {
      const result = await disconnectWalletAction(prev, formData);
      if (result.ok) {
        push(dictionary.settings.walletDisconnected, "success");
        router.refresh();
      }
      return result;
    },
    initial,
  );

  const status: WalletPanelStatus =
    connectState?.ok === true
      ? {
          ...initialStatus,
          connected: true,
          label: connectState.label ?? initialStatus.label,
          capabilities: connectState.capabilities ?? initialStatus.capabilities,
          includesPayInvoice:
            connectState.includesPayInvoice ?? initialStatus.includesPayInvoice,
          receiveOnlyRecommended: !(
            connectState.includesPayInvoice ?? initialStatus.includesPayInvoice
          ),
        }
      : disconnectState?.ok === true
        ? {
            ...initialStatus,
            connected: false,
            label: null,
            capabilities: [],
            includesPayInvoice: false,
            receiveOnlyRecommended: true,
            network: null,
            lud16: null,
          }
        : initialStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.settings.wallet}</CardTitle>
        <CardDescription>{dictionary.settings.walletHint}</CardDescription>
      </CardHeader>

      {status.demoMode ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {dictionary.settings.demoWalletMode}
        </p>
      ) : null}

      {status.connected ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
            <p className="font-medium text-navy">
              {dictionary.common.connected}
              {status.label ? ` — ${status.label}` : ""}
            </p>
            {status.network ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {dictionary.settings.network}: {status.network}
              </p>
            ) : null}
            {status.lud16 ? (
              <p className="text-xs text-muted-foreground">
                Lightning address: {status.lud16}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {dictionary.settings.capabilities}:{" "}
              {status.capabilities.length
                ? status.capabilities.join(", ")
                : "—"}
            </p>
            {status.includesPayInvoice ? (
              <p className="mt-2 text-xs text-amber-800">
                {dictionary.settings.walletPayWarning}
              </p>
            ) : (
              <p className="mt-2 text-xs text-success">
                {dictionary.settings.receiveOnlyOk}
              </p>
            )}
          </div>
          <form action={disconnectAction}>
            <input type="hidden" name="merchantId" value={merchantId} />
            <Button
              type="submit"
              variant="danger"
              loading={disconnectPending}
            >
              {dictionary.settings.disconnectWallet}
            </Button>
          </form>
        </div>
      ) : (
        <form action={connectAction} className="space-y-3">
          <input type="hidden" name="merchantId" value={merchantId} />
          <div>
            <Label htmlFor="wallet-label">{dictionary.settings.walletLabel}</Label>
            <Input
              id="wallet-label"
              name="label"
              maxLength={80}
              placeholder={dictionary.settings.walletLabelPlaceholder}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="nwc-uri">{dictionary.settings.nwcUri}</Label>
            <Input
              id="nwc-uri"
              name="nwcUri"
              ref={uriRef}
              type="password"
              autoComplete="off"
              required
              placeholder="nostr+walletconnect://…"
              spellCheck={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {dictionary.settings.nwcUriHint}
            </p>
          </div>
          {connectState && !connectState.ok ? (
            <FieldError message={connectState.error} />
          ) : null}
          <Button type="submit" loading={connectPending}>
            {dictionary.settings.connectWallet}
          </Button>
        </form>
      )}
    </Card>
  );
}
