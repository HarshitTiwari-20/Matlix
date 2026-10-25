import type { Metadata } from "next";
import { AuthForm } from "../../components/AuthForm";
import { AuthShell } from "../../components/AuthShell";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Matiks account and start racing opponents in mental math.",
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
