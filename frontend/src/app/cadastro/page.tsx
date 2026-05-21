import type { Metadata } from "next";
import { RegisterCard } from "@/components/cadastro/RegisterCard";
import { RegisterForm } from "@/components/cadastro/RegisterForm";
import { RegisterLayout } from "@/components/cadastro/RegisterLayout";

export const metadata: Metadata = {
  title: "Cadastro | Bellory",
  description: "Crie sua conta Bellory e ative seu salao com trial, tenant e onboarding automaticos."
};

export default function CadastroPage() {
  return (
    <RegisterLayout>
      <RegisterCard>
        <RegisterForm />
      </RegisterCard>
    </RegisterLayout>
  );
}
