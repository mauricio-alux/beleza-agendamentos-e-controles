"use client";

import { CheckCircle2, Copy, ExternalLink, Link2, MessageCircle, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SetupCard } from "@/components/onboarding/SetupCard";
import { bookingAbsoluteUrl, bookingPathLabel } from "@/lib/booking-link";
import { APP_BRAND } from "@/config/app-brand";
import { Button } from "@/components/ui/button";

export function CompletionCard() {
  const { data, settings } = useOnboarding();
  const selectedServices = data.services.filter((service) => service.selected);
  const salonName = data.nome_fantasia || settings?.nome_fantasia || "meu espaco";
  const bookingUrl = bookingAbsoluteUrl(settings?.slug);
  const bookingLabel = bookingPathLabel(settings?.slug);
  const inviteMessage = useMemo(() => buildInviteMessage(salonName, bookingUrl || bookingLabel), [salonName, bookingUrl, bookingLabel]);
  const [feedback, setFeedback] = useState("");

  async function copyText(value: string, message: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setFeedback(message);
    } catch {
      setFeedback("Nao foi possivel copiar automaticamente.");
    }
  }

  async function shareInvite() {
    if (!navigator.share) {
      await copyText(inviteMessage, "Mensagem copiada.");
      return;
    }

    try {
      await navigator.share({
        title: `Agendamento online - ${salonName}`,
        text: inviteMessage,
        url: bookingUrl || undefined
      });
      setFeedback("Compartilhamento aberto.");
    } catch {
      setFeedback("");
    }
  }

  function openWhatsApp() {
    const target = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
    window.open(target, "_blank", "noopener,noreferrer");
    setFeedback("WhatsApp aberto com a mensagem pronta.");
  }

  return (
    <SetupCard
      title="Seu salao esta pronto para entrar em operacao"
      description={`Revise o resumo e finalize para seguir ao painel do ${APP_BRAND.appName}.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Salao</p>
          <p className="mt-2 text-lg font-bold text-foreground">{data.nome_fantasia || settings?.nome_fantasia}</p>
          <p className="text-sm text-muted-foreground">{data.cidade || "Cidade"} {data.estado ? `- ${data.estado}` : ""}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Agenda</p>
          <p className="mt-2 text-lg font-bold text-foreground">
            {data.horario_inicio_padrao} as {data.horario_fim_padrao}
          </p>
          <p className="text-sm text-muted-foreground">Intervalos de {data.intervalo_agendamento} minutos</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/20 bg-secondary/70 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{selectedServices.length} servicos iniciais selecionados</p>
            <p className="text-sm leading-6 text-muted-foreground">
              {selectedServices.map((service) => service.nome).join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        <ExternalLink className="h-4 w-4 text-accent" />
        Link publico preparado: <span className="font-semibold text-foreground">{bookingLabel}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/25 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Convide seus clientes</p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Compartilhe seu link de agendamento</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Envie pelo seu WhatsApp para clientes atuais, contatos selecionados ou uma Lista de Transmissao.
            </p>
          </div>
          <MessageCircle className="hidden h-6 w-6 text-primary sm:block" />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <p className="whitespace-pre-line text-sm leading-6 text-foreground">{inviteMessage}</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Button type="button" variant="outline" onClick={() => copyText(inviteMessage, "Mensagem copiada.")}>
            <Copy className="h-4 w-4" />
            Copiar mensagem
          </Button>
          <Button type="button" variant="outline" onClick={() => copyText(bookingUrl || bookingLabel, "Link copiado.")}>
            <Link2 className="h-4 w-4" />
            Copiar link
          </Button>
          <Button type="button" variant="outline" onClick={shareInvite}>
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
          <Button type="button" variant="accent" onClick={openWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </Button>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          O envio acontece no seu aplicativo. O {APP_BRAND.appName} nao le seus contatos, nao cria Lista de Transmissao e nao confirma entrega ou leitura dessa primeira mensagem.
        </p>
        {feedback ? <p className="mt-3 text-sm font-semibold text-primary">{feedback}</p> : null}
      </div>
    </SetupCard>
  );
}

function buildInviteMessage(salonName: string, bookingUrl: string) {
  return [
    `Ola! Agora voce pode agendar seus horarios online com ${salonName}.`,
    "",
    "Escolha o servico e veja os horarios disponiveis pelo link:",
    bookingUrl,
    "",
    "Esperamos voce!"
  ].join("\n");
}
