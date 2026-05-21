"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppointmentModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function AppointmentModal({ open, title, children, onClose }: AppointmentModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/25 p-3 backdrop-blur-sm sm:place-items-center">
      <section className="w-full max-w-lg rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-glow">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
