import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default async function RegisterPage() {
  try {
    const session = await auth();
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch {
    // Auth/DB unavailable — still render register shell.
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Local credentials are hashed with bcrypt. Never reuse production passwords in demo environments."
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-navy underline decoration-navy/30 underline-offset-2 transition-colors hover:decoration-navy"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
