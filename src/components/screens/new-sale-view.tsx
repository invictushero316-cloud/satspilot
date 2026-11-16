"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { TransactionStatusNote } from "@/components/system/transaction-status-note";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { Customer, Merchant, Product } from "@/data/types";
import { formatMoneyXof } from "@/lib/format";
import { createIdempotencyKey } from "@/lib/idempotency-client";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  createSaleAction,
  type ActionState,
} from "@/server/actions/bookkeeping";

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};

export function NewSaleView({
  merchants,
  activeMerchantId,
  products,
  customers,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  products: Product[];
  customers: Customer[];
}) {
  const { dictionary, locale } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const activeProducts = products.filter((p) => p.active);

  const [lines, setLines] = useState<LineDraft[]>([
    {
      key: "1",
      productId: activeProducts[0]?.id ?? "",
      quantity: "1",
      unitPrice: String(activeProducts[0]?.unitPriceXof ?? "0"),
    },
  ]);
  const [method, setMethod] = useState<"cash" | "credit">("cash");
  const [customerId, setCustomerId] = useState("");
  const [cashPaid, setCashPaid] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey("sale"),
  );

  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await createSaleAction(prev, formData);
      if (result.ok) {
        setConfirmOpen(false);
        push(dictionary.sale.successToast, "success");
        setIdempotencyKey(createIdempotencyKey("sale"));
        router.push(
          `/sales?merchantId=${encodeURIComponent(activeMerchantId)}`,
        );
        router.refresh();
      }
      return result;
    },
    null,
  );

  const computedLines = useMemo(() => {
    return lines.map((line) => {
      const product = activeProducts.find((p) => p.id === line.productId);
      const qty = Number.parseInt(line.quantity, 10);
      const price = Number.parseInt(line.unitPrice, 10);
      const ok =
        product &&
        Number.isInteger(qty) &&
        qty > 0 &&
        Number.isInteger(price) &&
        price >= 0;
      return {
        ...line,
        product,
        qty: ok ? qty : null,
        price: ok ? price : null,
        lineTotal: ok ? qty * price : null,
      };
    });
  }, [lines, activeProducts]);

  const total = computedLines.every((l) => l.lineTotal != null)
    ? computedLines.reduce((sum, l) => sum + (l.lineTotal as number), 0)
    : null;

  function setProduct(key: string, productId: string) {
    const product = activeProducts.find((p) => p.id === productId);
    setLines((prev) =>
      prev.map((line) =>
        line.key === key
          ? {
              ...line,
              productId,
              unitPrice: product ? String(product.unitPriceXof) : line.unitPrice,
            }
          : line,
      ),
    );
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!computedLines.length) next.lines = dictionary.common.required;
    for (const line of computedLines) {
      if (!line.productId) next.lines = dictionary.sale.selectProduct;
      if (line.qty == null) next.qty = dictionary.sale.qtyError;
      if (line.price == null) next.price = dictionary.sale.priceError;
    }
    const cash = Number.parseInt(cashPaid || "0", 10);
    if (!Number.isInteger(cash) || cash < 0) next.cashPaid = dictionary.common.invalid;
    if (total != null && cash > total) next.cashPaid = dictionary.common.invalid;
    const unpaid = total != null ? total - cash : 0;
    if ((method === "credit" || unpaid > 0) && !customerId) {
      next.customerId = dictionary.sale.customerRequired;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const linesJson = JSON.stringify(
    computedLines.map((line) => ({
      productId: line.productId,
      productName: line.product?.name ?? "",
      quantity: line.qty,
      unitPriceMinor: line.price,
      currency: "XOF",
    })),
  );

  return (
    <AppShell
      titleKey="sale.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{dictionary.sale.title}</CardTitle>
        </CardHeader>
        <div className="mb-3">
          <TransactionStatusNote kind="draft" />
        </div>
        <div className="space-y-4">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="space-y-3 rounded-lg border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-navy">
                  {dictionary.sale.product} {index + 1}
                </p>
                {lines.length > 1 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setLines((prev) => prev.filter((l) => l.key !== line.key))
                    }
                  >
                    {dictionary.sale.removeLine}
                  </Button>
                ) : null}
              </div>
              <div>
                <Label>{dictionary.sale.product}</Label>
                <Select
                  value={line.productId}
                  onChange={(e) => setProduct(line.key, e.target.value)}
                >
                  <option value="">{dictionary.sale.selectProduct}</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{dictionary.sale.quantity}</Label>
                  <Input
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, quantity: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>{dictionary.sale.unitPrice}</Label>
                  <Input
                    inputMode="numeric"
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key
                            ? { ...l, unitPrice: e.target.value }
                            : l,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <FieldError message={errors.lines || errors.qty || errors.price} />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: createIdempotencyKey("line"),
                  productId: activeProducts[0]?.id ?? "",
                  quantity: "1",
                  unitPrice: String(activeProducts[0]?.unitPriceXof ?? "0"),
                },
              ])
            }
          >
            {dictionary.sale.addLine}
          </Button>

          <div>
            <Label htmlFor="method">{dictionary.sale.paymentMethod}</Label>
            <Select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "cash" | "credit")}
            >
              <option value="cash">{dictionary.sale.methods.cash}</option>
              <option value="credit">{dictionary.sale.methods.credit}</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="cashPaid">{dictionary.sale.cashPaid}</Label>
            <Input
              id="cashPaid"
              inputMode="numeric"
              value={cashPaid}
              placeholder={method === "cash" && total != null ? String(total) : "0"}
              invalid={Boolean(errors.cashPaid)}
              onChange={(e) => setCashPaid(e.target.value)}
            />
            <FieldError message={errors.cashPaid} />
          </div>

          <div>
            <Label htmlFor="customer">{dictionary.sale.customerOptional}</Label>
            <Select
              id="customer"
              value={customerId}
              invalid={Boolean(errors.customerId)}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">—</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.customerId} />
          </div>

          <div className="rounded-lg bg-surface-muted px-3 py-3">
            <p className="text-xs text-muted-foreground">{dictionary.sale.total}</p>
            <p className="text-xl font-semibold tabular-nums text-navy">
              {total === null ? "—" : formatMoneyXof(total, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {dictionary.money.xofNote}
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (method === "cash" && cashPaid === "" && total != null) {
                setCashPaid(String(total));
              }
              if (validate()) setConfirmOpen(true);
            }}
          >
            {dictionary.common.confirm}
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={dictionary.sale.confirmTitle}
        description={dictionary.sale.confirmBody}
      >
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="merchantId" value={activeMerchantId} />
          <input type="hidden" name="customerId" value={customerId} />
          <input
            type="hidden"
            name="paymentMethod"
            value={method === "cash" ? "CASH" : "CREDIT"}
          />
          <input
            type="hidden"
            name="cashPaidMinor"
            value={
              cashPaid ||
              (method === "cash" && total != null ? String(total) : "0")
            }
          />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <input type="hidden" name="linesJson" value={linesJson} />
          <p className="text-sm tabular-nums text-navy">
            {dictionary.sale.total}:{" "}
            {total === null ? "—" : formatMoneyXof(total, locale)}
          </p>
          {state && !state.ok ? <FieldError message={state.error} /> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              {dictionary.common.cancel}
            </Button>
            <Button type="submit" className="flex-1" loading={pending}>
              {dictionary.common.confirm}
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
