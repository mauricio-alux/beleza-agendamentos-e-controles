import { AvailabilityIndicator } from "@/components/agenda/AvailabilityIndicator";
import type { AvailabilityResponse } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type TimeSlotsProps = {
  availability: AvailabilityResponse | null;
  selectedSlot: string;
  onSelect: (slot: string) => void;
};

export function TimeSlots({ availability, selectedSlot, onSelect }: TimeSlotsProps) {
  const slots = availability?.slots || [];

  return (
    <div className="space-y-4">
      <AvailabilityIndicator total={slots.length} reason={availability?.unavailable_reason} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {slots.map((slot) => (
          <button
            key={slot.inicio}
            type="button"
            onClick={() => onSelect(slot.inicio)}
            className={cn(
              "min-h-12 rounded-2xl border px-4 text-sm font-bold transition duration-200",
              selectedSlot === slot.inicio
                ? "border-primary bg-primary text-primary-foreground shadow-blush"
                : "border-border bg-white/90 text-foreground hover:border-primary hover:text-primary"
            )}
          >
            {slot.hora}
          </button>
        ))}
      </div>
    </div>
  );
}
