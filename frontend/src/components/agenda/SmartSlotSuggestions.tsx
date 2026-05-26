import { Sparkles } from "lucide-react";
import { SlotRankingBadge } from "@/components/agenda/SlotRankingBadge";
import type { AvailabilitySlot } from "@/services/agenda.service";

type SmartSlotSuggestionsProps = {
  slots: AvailabilitySlot[];
  onSelect?: (slot: string) => void;
};

export function SmartSlotSuggestions({ slots, onSelect }: SmartSlotSuggestionsProps) {
  if (!slots.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Sugestoes inteligentes
      </div>
      <div className="grid gap-2">
        {slots.slice(0, 3).map((slot) => (
          <button
            key={slot.inicio}
            type="button"
            onClick={() => onSelect?.(slot.inicio)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow-blush"
          >
            <div>
              <p className="font-bold text-foreground">{slot.hora}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Score {slot.ranking_score ?? slot.score}/100
              </p>
            </div>
            <SlotRankingBadge slot={slot} />
          </button>
        ))}
      </div>
    </div>
  );
}
