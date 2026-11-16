"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  WalletConnectPanel,
  type WalletPanelStatus,
} from "@/components/wallet/wallet-connect-panel";
import type { Merchant } from "@/data/types";
import { useLocale } from "@/lib/i18n/locale-context";
import type { SupportedLocale } from "@/lib/i18n/locales";
import {
  setNostrOptInAction,
  type ReceiptActionState,
} from "@/server/actions/receipts";

export function SettingsView({
  merchants,
  merchant,
  walletStatus,
}: {
  merchants: Merchant[];
  merchant: Merchant;
  walletStatus: WalletPanelStatus;
}) {
  const activeMerchantId = merchant.id;
  const { dictionary, locale, setLocale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [name, setName] = useState(merchant.name);
  const [city, setCity] = useState(merchant.city);
  const [phone, setPhone] = useState(merchant.phone);
  const [currency] = useState<"XOF">("XOF");
  const [loading, setLoading] = useState(false);
  const optedIn = Boolean(merchant.nostrPublishOptIn);

  const [optInState, optInAction, optInPending] = useActionState(
    async (prev: ReceiptActionState | null, formData: FormData) => {
      const result = await setNostrOptInAction(prev, formData);
      if (result.ok) {
        push(dictionary.common.success, "success");
        router.refresh();
      }
      return result;
    },
    null,
  );

  async function onSave() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    setLoading(false);
    push(dictionary.settings.savedDemo, "success");
  }

  return (
    <AppShell
      titleKey="settings.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.settings.language}</CardTitle>
          </CardHeader>
          <Label htmlFor="lang">{dictionary.settings.language}</Label>
          <Select
            id="lang"
            value={locale}
            onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          >
            <option value="en">{dictionary.settings.english}</option>
            <option value="fr">{dictionary.settings.french}</option>
          </Select>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dictionary.settings.displayCurrency}</CardTitle>
            <CardDescription>{dictionary.money.xofNote}</CardDescription>
          </CardHeader>
          <Select value={currency} disabled aria-readonly>
            <option value="XOF">XOF</option>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {dictionary.money.satsNote}
          </p>
        </Card>

        <WalletConnectPanel
          merchantId={activeMerchantId}
          initialStatus={walletStatus}
        />

        <Card>
          <CardHeader>
            <CardTitle>{dictionary.settings.nostrPublish}</CardTitle>
            <CardDescription>
              {dictionary.settings.nostrPublishHint}
            </CardDescription>
          </CardHeader>
          <form action={optInAction} className="space-y-3">
            <input type="hidden" name="merchantId" value={activeMerchantId} />
            <input
              type="hidden"
              name="optIn"
              value={optedIn ? "false" : "true"}
            />
            {optInState && !optInState.ok ? (
              <FieldError message={optInState.error} />
            ) : null}
            <Button type="submit" variant="secondary" loading={optInPending}>
              {optedIn
                ? dictionary.settings.nostrPublishDisable
                : dictionary.settings.nostrPublishEnable}
            </Button>
            <p className="text-xs text-muted-foreground">
              Status: {optedIn ? dictionary.common.connected : dictionary.common.disconnected}
            </p>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dictionary.settings.profile}</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="biz">{dictionary.settings.name}</Label>
              <Input
                id="biz"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">{dictionary.settings.city}</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">{dictionary.settings.phone}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button loading={loading} onClick={onSave}>
              {dictionary.common.save}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
