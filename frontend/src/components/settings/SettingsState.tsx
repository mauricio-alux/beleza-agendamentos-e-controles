"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";

type SettingsStateProps = {
  type: "loading" | "error" | "empty";
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export function SettingsState({ type, title, description, onRetry }: SettingsStateProps) {
  if (type === "loading") {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-[1.5rem] border border-white/80 bg-white/85 p-6 shadow-soft">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Carregando configuracoes...
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[320px] place-items-center rounded-[1.5rem] border border-white/80 bg-white/90 p-6 text-center shadow-soft">
      <div className="max-w-md space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title || "Nada para mostrar"}</h2>
          <FeedbackMessage
            tone={type === "error" ? "error" : "info"}
            message={description || "Esta area ainda nao esta disponivel para o seu perfil."}
            className="mt-3 text-left"
          />
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    </div>
  );
}
