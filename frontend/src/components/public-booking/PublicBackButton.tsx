"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  fallbackHref?: string;
  label?: string;
};

function hasInternalReferrer() {
  if (typeof window === "undefined" || !document.referrer) return false;

  try {
    const referrer = new URL(document.referrer);
    const current = new URL(window.location.href);
    return referrer.origin === current.origin && referrer.href !== current.href;
  } catch {
    return false;
  }
}

export function PublicBackButton({ fallbackHref = "/", label = "Voltar" }: Props) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1 && hasInternalReferrer()) {
      router.back();
      return;
    }

    router.push(fallbackHref || "/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Voltar para a página anterior"
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-bold text-foreground shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
