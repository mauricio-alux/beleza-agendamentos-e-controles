import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { APP_BRAND } from "@/config/app-brand";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: `Crie uma nova senha para acessar o ${APP_BRAND.appName}.`
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Redefinir senha"
        subtitle="Crie uma nova senha para voltar a acessar sua conta com seguranca."
      >
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
