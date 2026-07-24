"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, PlayCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoDemoSection } from "@/components/VideoDemoSection";
import { VideoModal } from "@/components/VideoModal";
import { APP_BRAND } from "@/config/app-brand";

const heroVideo = {
  videoUrl: "/videos/bellory-hero-preview.mp4",
  fullVideoUrl: "/videos/bellory-demo-completo.mp4",
  thumbnailUrl: "/images/bellory-video-thumbnail.svg",
  title: `Veja o ${APP_BRAND.appName} em ação`,
  subtitle: "Agenda, WhatsApp, clientes, campanhas e métricas em um fluxo simples para salões modernos."
};

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <section className="overflow-hidden">
      <div className="container grid min-h-[calc(100vh-5rem)] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:py-20">
        <div className="animate-fade-up">
          <span className="eyebrow">Beauty Tech premium</span>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            Automatize seu salão e fidelize clientes com inteligência.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {APP_BRAND.appName} une agenda online, CRM, WhatsApp e automações em uma experiência leve,
            moderna e elegante para profissionais da beleza.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/cadastro">
                Começar agora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" type="button" onClick={() => setIsDemoOpen(true)}>
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
              Ver demonstração
            </Button>
          </div>

          <div className="mt-8 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Trial grátis para começar com calma
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />
            <p>Sem app para seus clientes baixarem.</p>
          </div>
        </div>

        <VideoDemoSection
          videoUrl={heroVideo.videoUrl}
          thumbnailUrl={heroVideo.thumbnailUrl}
          title={heroVideo.title}
          subtitle={heroVideo.subtitle}
          ctaLabel="Começar teste grátis"
          ctaHref="/cadastro"
          onDemoClick={() => setIsDemoOpen(true)}
          className="pb-8 pt-4 lg:pb-0"
        />
      </div>

      <VideoModal
        open={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        videoUrl={heroVideo.fullVideoUrl}
        thumbnailUrl={heroVideo.thumbnailUrl}
        title={`Demonstração completa do ${APP_BRAND.appName}`}
        subtitle={`Um tour curto para entender como o ${APP_BRAND.appName} organiza agenda, clientes, WhatsApp e automações.`}
      />
    </section>
  );
}
