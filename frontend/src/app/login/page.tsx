import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { APP_BRAND } from "@/config/app-brand";

export const metadata: Metadata = {
  title: "Login",
  description: "Acesse sua conta para gerenciar seu salão com tecnologia simples e elegante."
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title={`Entre no ${APP_BRAND.appName}`}
        subtitle="Acesse sua conta para continuar a configuração do salão e preparar sua operação para crescer."
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
