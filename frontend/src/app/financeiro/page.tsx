import type { Metadata } from "next";
import { WalletCards } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Financeiro | Bellory"
};

export default function FinanceiroPage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Financeiro"
        description="Acompanhe faturamento, performance e indicadores para decisoes mais claras."
        icon={WalletCards}
        actionLabel="Ver indicadores"
      />
    </DashboardLayout>
  );
}
