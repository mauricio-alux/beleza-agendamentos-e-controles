import type { Metadata } from "next";
import { TeamManager } from "@/components/team/TeamManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Equipe"
};

export default function EquipePage() {
  return (
    <DashboardLayout>
      <TeamManager />
    </DashboardLayout>
  );
}
