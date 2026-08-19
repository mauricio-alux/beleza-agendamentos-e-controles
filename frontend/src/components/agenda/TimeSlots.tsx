import { AvailabilityIndicator } from "@/components/agenda/AvailabilityIndicator";
import { SlotRankingBadge } from "@/components/agenda/SlotRankingBadge";
import type { AvailabilityResponse } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type TimeSlotsProps = {
  availability: AvailabilityResponse | null;
  selectedSlot: string;
  onSelect: (slot: string) => void;
  isLoading?: boolean;
  isConfigured?: boolean;
  disabled?: boolean;
};

export function TimeSlots({
  availability,
  selectedSlot,
  onSelect,
  isLoading = false,
  isConfigured = false,
  disabled = false
}: TimeSlotsProps) {
  const slots = availability?.slots || [];

  return (
    <div className="space-y-4">
      <AvailabilityIndicator
        total={slots.length}
        reason={availability?.unavailable_reason}
        strategy={availability?.intelligence?.ranking_strategy}
        availability={availability}
        hasResult={Boolean(availability)}
        isLoading={isLoading}
        isConfigured={isConfigured}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {slots.map((slot) => (
          <button
            key={slot.inicio}
            type="button"
            onClick={() => !disabled && onSelect(slot.inicio)}
            disabled={disabled}
            className={cn(
              "min-h-12 rounded-2xl border px-4 text-sm font-bold transition duration-200",
              selectedSlot === slot.inicio
                ? "border-primary bg-primary text-primary-foreground shadow-blush"
                : "border-border bg-white/90 text-foreground hover:border-primary hover:text-primary",
              disabled && "cursor-not-allowed opacity-60 hover:border-border hover:text-foreground"
            )}
          >
            <span className="flex flex-col items-center gap-1">
              <span>{slot.hora}</span>
              <SlotRankingBadge slot={slot} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
