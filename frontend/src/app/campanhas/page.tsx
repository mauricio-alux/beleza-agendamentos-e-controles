import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Campanhas | Bellory"
};

export default function CampanhasPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Campanhas"
        description="Crie relacionamento, lembretes, recuperacao de clientes e campanhas via WhatsApp."
        icon={Megaphone}
        actionLabel="Nova campanha"
      />
    </DashboardLayout>
  );
}
