"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfessionalScheduleDay } from "@/services/agenda.service";

const WEEKDAYS = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado"
];

function emptyDay(weekday: number): ProfessionalScheduleDay {
  return {
    weekday,
    work_start_morning: "09:00",
    work_end_morning: "12:00",
    work_start_afternoon: "13:00",
    work_end_afternoon: "18:00",
    break_start: "12:00",
    break_end: "13:00",
    is_working: weekday !== 0,
    is_exception: false
  };
}

function toTimeValue(value?: string | null) {
  return value ? value.slice(0, 5) : "";
}

function normalizeDays(days: ProfessionalScheduleDay[]) {
  return WEEKDAYS.map((_, weekday) => {
    const found = days.find((item) => item.weekday === weekday && !item.is_exception);
    return found
      ? {
          ...emptyDay(weekday),
          ...found,
          work_start_morning: toTimeValue(found.work_start_morning),
          work_end_morning: toTimeValue(found.work_end_morning),
          work_start_afternoon: toTimeValue(found.work_start_afternoon),
          work_end_afternoon: toTimeValue(found.work_end_afternoon),
          break_start: toTimeValue(found.break_start),
          break_end: toTimeValue(found.break_end)
        }
      : emptyDay(weekday);
  });
}

type WeeklyScheduleEditorProps = {
  schedules: ProfessionalScheduleDay[];
  isSaving: boolean;
  onSave: (schedules: ProfessionalScheduleDay[]) => Promise<void>;
};

export function WeeklyScheduleEditor({ schedules, isSaving, onSave }: WeeklyScheduleEditorProps) {
  const initialDays = useMemo(() => normalizeDays(schedules), [schedules]);
  const [days, setDays] = useState(initialDays);
  const [error, setError] = useState("");

  useEffect(() => {
    setDays(initialDays);
  }, [initialDays]);

  function updateDay(weekday: number, payload: Partial<ProfessionalScheduleDay>) {
    setDays((current) => current.map((day) => (day.weekday === weekday ? { ...day, ...payload } : day)));
  }

  function updatePairedTime(
    weekday: number,
    startKey: keyof ProfessionalScheduleDay,
    endKey: keyof ProfessionalScheduleDay,
    changedKey: keyof ProfessionalScheduleDay,
    value: string
  ) {
    if (value) {
      updateDay(weekday, { [changedKey]: value } as Partial<ProfessionalScheduleDay>);
      return;
    }

    updateDay(weekday, {
      [startKey]: null,
      [endKey]: null
    } as Partial<ProfessionalScheduleDay>);
  }

  function validate() {
    for (const day of days) {
      if (!day.is_working) continue;

      const windows = [
        [day.work_start_morning, day.work_end_morning],
        [day.work_start_afternoon, day.work_end_afternoon]
      ];

      for (const [start, end] of windows) {
        if ((start && !end) || (!start && end)) {
          return `${WEEKDAYS[day.weekday]} possui janela incompleta.`;
        }

        if (start && end && start >= end) {
          return `${WEEKDAYS[day.weekday]} possui horario inicial maior que o final.`;
        }
      }

      if (day.work_end_morning && day.work_start_afternoon && day.work_end_morning > day.work_start_afternoon) {
        return `${WEEKDAYS[day.weekday]} possui janelas sobrepostas.`;
      }

      if (day.break_start && day.break_end && day.break_start >= day.break_end) {
        return `${WEEKDAYS[day.weekday]} possui intervalo invalido.`;
      }
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    await onSave(days);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <FeedbackMessage tone="error" message={error} /> : null}

      <div className="grid gap-3">
        {days.map((day) => (
          <section key={day.weekday} className="rounded-[1.25rem] border border-white/80 bg-white/92 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground">{WEEKDAYS[day.weekday]}</h2>
                <p className="text-xs leading-5 text-muted-foreground">
                  Configure janelas de trabalho e intervalo deste profissional.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={day.is_working}
                  onChange={(event) =>
                    updateDay(day.weekday, {
                      is_working: event.target.checked,
                      ...(event.target.checked
                        ? {}
                        : {
                            work_start_morning: null,
                            work_end_morning: null,
                            work_start_afternoon: null,
                            work_end_afternoon: null,
                            break_start: null,
                            break_end: null
                          })
                    })
                  }
                  className="h-5 w-5 rounded border-border accent-primary"
                />
                Trabalha
              </label>
            </div>

            {day.is_working ? (
              <>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Deixe um periodo vazio quando o profissional nao atende naquele turno. Intervalo tambem e opcional.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <TimeField
                    label="Inicio manha"
                    value={day.work_start_morning}
                    onChange={(value) =>
                      updatePairedTime(day.weekday, "work_start_morning", "work_end_morning", "work_start_morning", value)
                    }
                  />
                  <TimeField
                    label="Fim manha"
                    value={day.work_end_morning}
                    onChange={(value) =>
                      updatePairedTime(day.weekday, "work_start_morning", "work_end_morning", "work_end_morning", value)
                    }
                  />
                  <TimeField
                    label="Inicio tarde"
                    value={day.work_start_afternoon}
                    onChange={(value) =>
                      updatePairedTime(day.weekday, "work_start_afternoon", "work_end_afternoon", "work_start_afternoon", value)
                    }
                  />
                  <TimeField
                    label="Fim tarde"
                    value={day.work_end_afternoon}
                    onChange={(value) =>
                      updatePairedTime(day.weekday, "work_start_afternoon", "work_end_afternoon", "work_end_afternoon", value)
                    }
                  />
                  <TimeField
                    label="Inicio intervalo"
                    value={day.break_start}
                    onChange={(value) => updatePairedTime(day.weekday, "break_start", "break_end", "break_start", value)}
                  />
                  <TimeField
                    label="Fim intervalo"
                    value={day.break_end}
                    onChange={(value) => updatePairedTime(day.weekday, "break_start", "break_end", "break_end", value)}
                  />
                </div>
              </>
            ) : null}
          </section>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar escala"}
        </Button>
      </div>
    </form>
  );
}

function TimeField({
  label,
  value,
  onChange
}: {
  label: string;
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="time" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
