import type { AvailabilitySlot } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type SlotRankingBadgeProps = {
  slot: AvailabilitySlot;
};

export function SlotRankingBadge({ slot }: SlotRankingBadgeProps) {
  const quality = slot.slot_quality || "bom";
  const label = {
    otimo: "Otimo encaixe",
    bom: "Bom",
    regular: "Regular",
    baixo: "Disponivel"
  }[quality];

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        quality === "otimo" && "bg-accent/10 text-accent",
        quality === "bom" && "bg-secondary text-primary",
        quality === "regular" && "bg-muted text-muted-foreground",
        quality === "baixo" && "bg-background text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
