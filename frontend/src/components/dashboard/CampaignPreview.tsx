import { Megaphone } from "lucide-react";
import type { DashboardCampaign } from "@/services/dashboard.service";
import { EmptyState } from "@/components/dashboard/EmptyState";

type CampaignPreviewProps = {
  campaigns: DashboardCampaign[];
};

export function CampaignPreview({ campaigns }: CampaignPreviewProps) {
  if (!campaigns.length) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Campanhas inteligentes"
        description="O Bellory ja esta preparado para campanhas, retorno de clientes e WhatsApp operacional."
        actionLabel="Nova campanha"
      />
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="rounded-2xl border border-border bg-background/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-foreground">{campaign.title}</p>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold capitalize text-accent">
              {campaign.status}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{campaign.description}</p>
        </div>
      ))}
    </div>
  );
}
