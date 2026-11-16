import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { APP_TAGLINE } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  try {
    const session = await auth();
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch {
    // Auth/DB unavailable — still render the sign-in shell.
  }

  const params = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      subtitle={APP_TAGLINE}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/register"
            className="font-medium text-navy underline decoration-navy/30 underline-offset-2 transition-colors hover:decoration-navy"
          >
            Create one
          </Link>
        </p>
      }
    >
      <LoginForm callbackUrl={params.callbackUrl ?? "/dashboard"} />
    </AuthShell>
  );
}
