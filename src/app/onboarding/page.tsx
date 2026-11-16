import { redirect } from "next/navigation";

import { CreateMerchantForm } from "@/components/auth/create-merchant-form";
import { requireSession } from "@/server/auth/session";
import { getMerchantsForUser } from "@/server/data/merchants";

export default async function OnboardingPage() {
  const session = await requireSession();
  const merchants = await getMerchantsForUser(session.user.id);
  if (merchants.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-navy">
            Set up your merchant
          </h1>
          <p className="text-sm text-muted-foreground">
            Create a merchant profile to access the dashboard. Membership is
            required for every merchant-owned record.
          </p>
        </div>
        <CreateMerchantForm />
      </div>
    </main>
  );
}
