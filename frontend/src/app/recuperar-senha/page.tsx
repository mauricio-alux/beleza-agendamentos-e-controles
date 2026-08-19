import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RecoverPasswordForm } from "@/components/auth/RecoverPasswordForm";
import { APP_BRAND } from "@/config/app-brand";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: `Receba instrucoes para redefinir sua senha no ${APP_BRAND.appName}.`
};

export default function RecoverPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Recuperar senha"
        subtitle="Informe o email cadastrado para receber as instrucoes de redefinicao."
      >
        <RecoverPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
