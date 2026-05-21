import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyAgendaState() {
  return (
    <div className="grid place-items-center rounded-[1.5rem] border border-dashed border-border bg-white/80 p-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
        <CalendarDays className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">Nenhum atendimento neste dia</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Crie o primeiro agendamento e deixe o Bellory organizar os horarios disponiveis automaticamente.
      </p>
      <Button asChild className="mt-5">
        <Link href="/agenda/novo">Novo agendamento</Link>
      </Button>
    </div>
  );
}
