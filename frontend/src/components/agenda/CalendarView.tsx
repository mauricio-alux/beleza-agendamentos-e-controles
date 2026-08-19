import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatAgendaRange,
  formatDateShort,
  formatLongDate,
  isTodayDateInput,
  shiftDateInput,
  toDateInput
} from "@/components/agenda/date";

type CalendarViewProps = {
  date: string;
  onChange: (date: string) => void;
  periodLabel?: string;
};

export function CalendarView({ date, onChange, periodLabel = "Periodo consultado" }: CalendarViewProps) {
  const isToday = isTodayDateInput(date);
  const title = isToday ? `Hoje - ${formatDateShort(date)}` : `Agenda de ${formatDateShort(date)}`;

  return (
    <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" size="icon" aria-label="Dia anterior" onClick={() => onChange(shiftDateInput(date, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Agenda do dia</p>
          <p className="mt-1 text-base font-bold text-foreground">{title}</p>
          <p className="mt-1 text-xs font-semibold capitalize text-muted-foreground">{formatLongDate(date)}</p>
        </div>
        <Button type="button" variant="outline" size="icon" aria-label="Proximo dia" onClick={() => onChange(shiftDateInput(date, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-4 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
        {periodLabel}: {formatAgendaRange(date)} (America/Sao_Paulo)
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="date"
          aria-label="Selecionar data da agenda"
          value={date}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-semibold text-foreground"
        />
        <Button type="button" variant={isToday ? "default" : "outline"} onClick={() => onChange(toDateInput(new Date()))}>
          <CalendarDays className="h-4 w-4" />
          Hoje
        </Button>
      </div>
    </div>
  );
}
