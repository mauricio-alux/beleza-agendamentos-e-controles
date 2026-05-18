"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MessageCircle, Play, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VideoDemoSectionProps = {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  onDemoClick?: () => void;
  className?: string;
};

const previewItems = [
  { label: "Agenda", icon: CalendarDays },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Automação", icon: Sparkles },
  { label: "Métricas", icon: TrendingUp }
];

function FallbackPreview() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,179,193,0.35),transparent_22rem),linear-gradient(135deg,#2B2B2B_0%,#3E2448_52%,#7B4BFF_130%)] p-4 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Preview vivo</p>
          <h3 className="mt-2 font-display text-2xl">Painel Bellory</h3>
        </div>
        <span className="rounded-full bg-white/14 px-3 py-1 text-xs">Ao vivo</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {previewItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/12 p-3 backdrop-blur">
              <Icon className="h-4 w-4 text-glow" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 text-foreground shadow-soft">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Hoje</span>
          <span>82% ocupação</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-muted p-3 text-sm">09:00 · Corte confirmado</div>
          <div className="rounded-xl bg-secondary p-3 text-sm">14:00 · Lembrete enviado</div>
        </div>
      </div>
    </div>
  );
}

export function VideoDemoSection({
  videoUrl,
  thumbnailUrl,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  onDemoClick,
  className
}: VideoDemoSectionProps) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <div className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle_at_70%_15%,rgba(255,179,193,0.35),transparent_18rem),radial-gradient(circle_at_20%_80%,rgba(123,75,255,0.18),transparent_18rem)] blur-sm" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white p-3 shadow-glow">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#2B2B2B] sm:aspect-video">
          {!videoFailed && (
            <video
              className="h-full w-full object-cover"
              src={videoUrl}
              poster={thumbnailUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setVideoFailed(true)}
              aria-label={title}
            />
          )}
          {videoFailed && <FallbackPreview />}

          {!videoFailed && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2B2B2B]/88 to-transparent p-4 text-white sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-glow">Veja o Bellory em ação</p>
              <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/72">{subtitle}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onDemoClick}
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-primary shadow-blush transition hover:scale-105 hover:bg-white"
            aria-label="Assistir demonstração"
          >
            <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-4">
          <div className="max-w-md text-sm leading-6 text-muted-foreground">
            Preview curto, silencioso e otimizado para mostrar valor em segundos.
          </div>
          <div className="grid gap-2 sm:flex sm:flex-row">
            <Button className="w-full sm:w-auto" variant="outline" type="button" onClick={onDemoClick}>
              Assistir demonstração
            </Button>
            <Button className="w-full sm:w-auto" asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
