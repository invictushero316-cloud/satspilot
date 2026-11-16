"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import type { Merchant, Product } from "@/data/types";
import { formatMoneyXof } from "@/lib/format";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  createProductAction,
  updateProductAction,
  type ActionState,
} from "@/server/actions/bookkeeping";

type Draft = {
  id?: string;
  name: string;
  category: string;
  unitPriceXof: string;
  trackStock: boolean;
  stockOnHand: string;
};

const emptyDraft: Draft = {
  name: "",
  category: "",
  unitPriceXof: "",
  trackStock: false,
  stockOnHand: "",
};

function ProductForm({
  draft,
  setDraft,
  merchantId,
  onDone,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  merchantId: string;
  onDone: () => void;
}) {
  const { dictionary } = useLocale();
  const { push } = useToast();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const action = draft.id ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState<ActionState | null, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (result.ok) {
        push(dictionary.products.saved, "success");
        onDone();
        router.refresh();
      }
      return result;
    },
    null,
  );

  function validate(): boolean {
    const next: Record<string, string> = {};
    const price = Number.parseInt(draft.unitPriceXof, 10);
    if (!draft.name.trim()) next.name = dictionary.common.required;
    if (!Number.isInteger(price) || price < 0)
      next.unitPriceXof = dictionary.sale.priceError;
    if (draft.trackStock) {
      const stock = Number.parseInt(draft.stockOnHand || "0", 10);
      if (!Number.isInteger(stock) || stock < 0)
        next.stockOnHand = dictionary.common.invalid;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={(event) => {
        if (!validate()) event.preventDefault();
      }}
    >
      <input type="hidden" name="merchantId" value={merchantId} />
      {draft.id ? <input type="hidden" name="productId" value={draft.id} /> : null}
      <div>
        <Label htmlFor="pname">{dictionary.products.name}</Label>
        <Input
          id="pname"
          name="name"
          value={draft.name}
          invalid={Boolean(errors.name)}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
        />
        <FieldError message={errors.name} />
      </div>
      <div>
        <Label htmlFor="pcat">{dictionary.products.category}</Label>
        <Input
          id="pcat"
          name="category"
          value={draft.category}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
        />
      </div>
      <div>
        <Label htmlFor="pprice">{dictionary.products.unitPrice}</Label>
        <Input
          id="pprice"
          name="unitPriceMinor"
          inputMode="numeric"
          value={draft.unitPriceXof}
          invalid={Boolean(errors.unitPriceXof)}
          onChange={(e) =>
            setDraft((d) => ({ ...d, unitPriceXof: e.target.value }))
          }
        />
        <FieldError message={errors.unitPriceXof} />
      </div>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input
          type="checkbox"
          name="trackStock"
          checked={draft.trackStock}
          onChange={(e) =>
            setDraft((d) => ({ ...d, trackStock: e.target.checked }))
          }
        />
        {dictionary.products.trackStock}
      </label>
      {draft.trackStock ? (
        <div>
          <Label htmlFor="pstock">{dictionary.products.stockOnHand}</Label>
          <Input
            id="pstock"
            name="stockOnHand"
            inputMode="numeric"
            value={draft.stockOnHand}
            invalid={Boolean(errors.stockOnHand)}
            onChange={(e) =>
              setDraft((d) => ({ ...d, stockOnHand: e.target.value }))
            }
          />
          <FieldError message={errors.stockOnHand} />
        </div>
      ) : null}
      {state && !state.ok ? <FieldError message={state.error} /> : null}
      <Button className="w-full" type="submit" loading={pending}>
        {dictionary.common.save}
      </Button>
    </form>
  );
}

export function ProductsView({
  merchants,
  activeMerchantId,
  products,
}: {
  merchants: Merchant[];
  activeMerchantId: string;
  products: Product[];
}) {
  const { dictionary, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function openCreate() {
    setDraft(emptyDraft);
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setDraft({
      id: product.id,
      name: product.name,
      category: product.category,
      unitPriceXof: String(product.unitPriceXof),
      trackStock: product.trackStock,
      stockOnHand:
        product.stockOnHand == null ? "" : String(product.stockOnHand),
    });
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <AppShell
      titleKey="products.title"
      merchants={merchants}
      activeMerchantId={activeMerchantId}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{dictionary.products.title}</CardTitle>
          <Button size="sm" onClick={openCreate}>
            {dictionary.products.add}
          </Button>
        </CardHeader>
        {products.length === 0 ? (
          <EmptyState
            title={dictionary.products.empty}
            action={
              <Button size="sm" onClick={openCreate}>
                {dictionary.products.add}
              </Button>
            }
          />
        ) : (
          <DataTable
            rows={products}
            columns={[
              {
                key: "name",
                header: dictionary.products.name,
                cell: (row) => row.name,
              },
              {
                key: "category",
                header: dictionary.products.category,
                cell: (row) => row.category || "—",
              },
              {
                key: "price",
                header: dictionary.products.unitPrice,
                className: "tabular-nums",
                cell: (row) => formatMoneyXof(row.unitPriceXof, locale),
              },
              {
                key: "stock",
                header: dictionary.products.stockOnHand,
                className: "tabular-nums",
                cell: (row) =>
                  row.trackStock ? String(row.stockOnHand ?? 0) : "—",
              },
              {
                key: "status",
                header: dictionary.common.status,
                cell: (row) => (
                  <Badge tone={row.active ? "success" : "neutral"}>
                    {row.active
                      ? dictionary.common.active
                      : dictionary.common.inactive}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: dictionary.common.actions,
                cell: (row) => (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(row)}
                  >
                    {dictionary.common.edit}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={draft.id ? dictionary.products.edit : dictionary.products.add}
      >
        <ProductForm
          key={formKey}
          draft={draft}
          setDraft={setDraft}
          merchantId={activeMerchantId}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </AppShell>
  );
}
