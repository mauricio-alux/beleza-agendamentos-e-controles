import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | Bellory",
  description: "Acesse sua conta Bellory para gerenciar seu salão com tecnologia simples e elegante."
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Entre no Bellory"
        subtitle="Acesse sua conta para continuar a configuração do salão e preparar sua operação para crescer."
      >
        <LoginForm />
      </AuthCard>
    </AuthLayout>
  );
}
