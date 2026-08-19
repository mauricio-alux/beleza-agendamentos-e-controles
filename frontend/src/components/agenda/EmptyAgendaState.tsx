import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/components/agenda/date";

export function EmptyAgendaState({
  canCreate = true,
  date,
  hasActiveFilters = false
}: {
  canCreate?: boolean;
  date: string;
  hasActiveFilters?: boolean;
}) {
  return (
    <div className="grid place-items-center rounded-[1.5rem] border border-dashed border-border bg-white/80 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
        <CalendarDays className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">
        Nenhum atendimento encontrado em {formatDateShort(date)}.
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {hasActiveFilters
          ? "Nenhum atendimento encontrado para esta data e para os filtros selecionados."
          : "Nenhum atendimento encontrado para esta data."}
      </p>
      {canCreate ? (
        <Button asChild className="mt-5">
          <Link href="/agenda/novo">Novo agendamento</Link>
        </Button>
      ) : null}
    </div>
  );
}
