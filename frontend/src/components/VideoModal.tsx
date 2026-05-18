"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type VideoModalProps = {
  open: boolean;
  onClose: () => void;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  subtitle?: string;
};

export function VideoModal({ open, onClose, videoUrl, thumbnailUrl, title, subtitle }: VideoModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B2B2B]/72 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/20 bg-[#111] shadow-glow">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 p-4 text-white sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-glow">Demonstração Bellory</p>
            <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10" aria-label="Fechar vídeo">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="aspect-video bg-black">
          <video
            className="h-full w-full object-cover"
            src={videoUrl}
            poster={thumbnailUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
          />
        </div>
      </div>
    </div>
  );
}
