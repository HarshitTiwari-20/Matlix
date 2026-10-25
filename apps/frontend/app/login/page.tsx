import type { Metadata } from "next";
import { AuthForm } from "../../components/AuthForm";
import { AuthShell } from "../../components/AuthShell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Matiks and jump into a live 1v1 mental math match.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
