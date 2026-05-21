import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/components/agenda/date";

type CalendarViewProps = {
  date: string;
  onChange: (date: string) => void;
};

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function CalendarView({ date, onChange }: CalendarViewProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(shiftDate(date, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Agenda do dia</p>
          <p className="mt-1 text-base font-bold capitalize text-foreground">{formatLongDate(date)}</p>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(shiftDate(date, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <input
        type="date"
        value={date}
        onChange={(event) => onChange(event.target.value)}
        className="mt-4 h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-semibold text-foreground"
      />
    </div>
  );
}
