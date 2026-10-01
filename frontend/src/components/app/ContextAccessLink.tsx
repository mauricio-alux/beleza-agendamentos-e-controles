"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useContextAvailability } from "@/hooks/useContextAvailability";

type Props = { target: "client" | "professional"; allowClientReturn?: boolean };

export function ContextAccessLink({ target, allowClientReturn = false }: Props) {
  const { client, professional, checking } = useContextAvailability();
  if (checking) return null;
  // Login may return to a known client without an established professional session.
  const clientReturn = allowClientReturn && target === "client";
  if (client.state !== "available" || (!clientReturn && professional !== "available")) return null;
  const text = target === "client" ? "Acessar como cliente" : "Acessar área profissional";
  return <Button asChild variant="ghost"><Link href={"/app?context=" + target}>{text}</Link></Button>;
}
