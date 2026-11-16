"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
} from "react";

import { AppShell } from "@/components/layout/app-shell";
import { TransactionStatusNote } from "@/components/system/transaction-status-note";
import { Badge } from "@/components/ui/badge";
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
import type { Merchant } from "@/data/types";
import { formatMoneySats } from "@/lib/format";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  createLightningInvoiceAction,
  pollLightningPaymentAction,
  type LightningActionState,
  type LightningInvoicePublic,
} from "@/server/actions/lightning";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

function statusTone(status: string): Tone {
  switch (status) {
    case "settled":
      return "success";
    case "pending":
      return "warning";
    case "expired":
    case "failed":
      return "danger";
    default:
      return "info";
  }
}

const createInitial: LightningActionState | null = null;

export function ReceiveLightningView({
  merchants,
  activeMerchantId,
  walletConnected,
  initialInvoice,
  demoMode,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  walletConnected: boolean;
  initialInvoice: LightningInvoicePublic | null;
  demoMode: boolean;
}) {
  const { dictionary, locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [polledInvoice, setPolledInvoice] =
    useState<LightningInvoicePublic | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey("ln-inv"),
  );
  const [pendingPoll, startPoll] = useTransition();

  const [createState, createAction, createPending] = useActionState(
    async (prev: LightningActionState | null, formData: FormData) => {
      const result = await createLightningInvoiceAction(prev, formData);
      if (result.ok && result.invoice) {
        push(dictionary.lightning.invoiceCreated, "success");
        router.replace(
          `/payments/receive?merchantId=${activeMerchantId}&paymentId=${result.invoice.paymentId}`,
        );
        router.refresh();
      }
      return result;
    },
    createInitial,
  );

  const invoice =
    polledInvoice ??
    (createState?.ok && createState.invoice ? createState.invoice : null) ??
    initialInvoice;

  useEffect(() => {
    if (!invoice?.paymentId) return;
    if (
      invoice.status === "settled" ||
      invoice.status === "expired" ||
      invoice.status === "failed"
    ) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      startPoll(async () => {
        const result = await pollLightningPaymentAction(
          activeMerchantId,
          invoice.paymentId,
        );
        if (cancelled) return;
        if (!result.ok) {
          setPollError(result.error);
          timer = setTimeout(tick, 4000);
          return;
        }
        setPollError(null);
        if (result.invoice) {
          setPolledInvoice(result.invoice);
          if (result.verified) {
            push(dictionary.lightning.settled, "success");
            return;
          }
          if (
            result.invoice.status === "expired" ||
            result.invoice.status === "failed"
          ) {
            return;
          }
        }
        timer = setTimeout(tick, 3000);
      });
    };

    timer = setTimeout(tick, 2500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    invoice?.paymentId,
    invoice?.status,
    activeMerchantId,
    dictionary.lightning.settled,
    push,
  ]);

  async function copyInvoice() {
    if (!invoice?.bolt11) return;
    try {
      await navigator.clipboard.writeText(invoice.bolt11);
      setCopied(true);
      push(dictionary.lightning.copied, "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      push(dictionary.common.error, "danger");
    }
  }

  function resetFlow() {
    setPolledInvoice(null);
    setPollError(null);
    setIdempotencyKey(createIdempotencyKey("ln-inv"));
    router.replace(`/payments/receive?merchantId=${activeMerchantId}`);
    router.refresh();
  }

  return (
    <AppShell
      titleKey="lightning.receiveTitle"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <div className="mx-auto grid max-w-lg gap-4">
        {demoMode ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {dictionary.lightning.demoModeNote}
          </p>
        ) : null}

        {!walletConnected ? (
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.lightning.walletRequired}</CardTitle>
              <CardDescription>
                {dictionary.lightning.walletRequiredHint}
              </CardDescription>
            </CardHeader>
            <Link
              href={`/settings?merchantId=${activeMerchantId}`}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-navy px-4 text-sm font-medium text-white"
            >
              {dictionary.settings.connectWallet}
            </Link>
          </Card>
        ) : null}

        {walletConnected && !invoice ? (
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.lightning.amountTitle}</CardTitle>
              <CardDescription>
                {dictionary.lightning.amountHint}
              </CardDescription>
            </CardHeader>
            <form action={createAction} className="space-y-3">
              <input type="hidden" name="merchantId" value={activeMerchantId} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
              <div>
                <Label htmlFor="amount-sats">
                  {dictionary.lightning.amountSats}
                </Label>
                <Input
                  id="amount-sats"
                  name="amountSats"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1_000_000}
                  step={1}
                  required
                  placeholder="21"
                />
              </div>
              <div>
                <Label htmlFor="ln-desc">{dictionary.common.notes}</Label>
                <Input
                  id="ln-desc"
                  name="description"
                  maxLength={200}
                  placeholder={dictionary.lightning.descriptionPlaceholder}
                />
              </div>
              {createState && !createState.ok ? (
                <FieldError message={createState.error} />
              ) : null}
              <Button type="submit" loading={createPending}>
                {dictionary.lightning.createInvoice}
              </Button>
            </form>
          </Card>
        ) : null}

        {invoice ? (
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.lightning.invoiceTitle}</CardTitle>
              <CardDescription>
                {invoice.amountSats != null
                  ? formatMoneySats(invoice.amountSats, locale)
                  : "—"}
              </CardDescription>
            </CardHeader>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(invoice.status)}>
                {invoice.status === "settled"
                  ? dictionary.common.settled
                  : invoice.status === "pending"
                    ? dictionary.common.pending
                    : invoice.status === "expired"
                      ? dictionary.common.expired
                      : invoice.status === "failed"
                        ? dictionary.common.failed
                        : dictionary.common.unknown}
              </Badge>
              {pendingPoll ? (
                <span className="text-xs text-muted-foreground">
                  {dictionary.lightning.checking}
                </span>
              ) : null}
            </div>
            <div className="mb-3">
              <TransactionStatusNote
                kind={
                  invoice.status === "settled"
                    ? "confirmed"
                    : invoice.status === "pending"
                      ? "pending_payment"
                      : "draft"
                }
              />
            </div>

            {invoice.bolt11 && invoice.status === "pending" ? (
              <div className="mb-4 flex flex-col items-center gap-3">
                <div className="rounded-xl border border-border bg-white p-3">
                  <QRCodeSVG value={invoice.bolt11} size={220} level="M" />
                </div>
                <p className="break-all rounded-lg bg-surface-muted px-3 py-2 font-mono text-[11px] leading-relaxed text-navy">
                  {invoice.bolt11}
                </p>
                <Button variant="secondary" onClick={copyInvoice}>
                  {copied
                    ? dictionary.lightning.copied
                    : dictionary.lightning.copyInvoice}
                </Button>
              </div>
            ) : null}

            {invoice.status === "settled" ? (
              <p className="mb-3 text-sm text-success">
                {dictionary.lightning.settled}
              </p>
            ) : null}

            {pollError ? <FieldError message={pollError} /> : null}

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={resetFlow}>
                {dictionary.lightning.newInvoice}
              </Button>
              <Link
                href={`/payments?merchantId=${activeMerchantId}`}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-medium text-navy"
              >
                {dictionary.payments.title}
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
