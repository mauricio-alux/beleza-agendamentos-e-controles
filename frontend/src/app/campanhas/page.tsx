import type { Metadata } from "next";
import { CampaignsManager } from "@/components/campaigns/CampaignsManager";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Campanhas"
};

export default function CampanhasPage() {
  return (
    <DashboardLayout>
      <CampaignsManager />
    </DashboardLayout>
  );
}
