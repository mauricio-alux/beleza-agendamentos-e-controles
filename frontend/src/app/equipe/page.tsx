import type { Metadata } from "next";
import { UserRoundCog } from "lucide-react";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Equipe | Bellory"
};

export default function EquipePage() {
  return (
    <DashboardLayout>
      <PlaceholderPage
        title="Equipe"
        description="Gerencie profissionais, papeis e disponibilidade em uma base multi-profissional."
        icon={UserRoundCog}
        actionLabel="Novo profissional"
      />
    </DashboardLayout>
  );
}
