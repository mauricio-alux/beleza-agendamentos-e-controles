"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { listClientAssociations } from "@/services/usuario-cliente.service";
import { Button } from "@/components/ui/button";
import { useContextAvailability } from "@/hooks/useContextAvailability";

type Props = { target: "client" | "professional"; allowClientReturn?: boolean };

export function ContextAccessLink({ target, allowClientReturn = false }: Props) {
  const { client, professional, checking, session } = useContextAvailability();
  const [associationOwner, setAssociationOwner] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setAssociationOwner(null);
    if (target === "client" && professional === "available" && session) {
      listClientAssociations(session).then(rows => {
        if (live && rows.length) setAssociationOwner(session.usuario.id);
      }).catch(() => {});
    }
    return () => { live = false; };
  }, [target, professional, session]);
  if (checking) return null;
  if (target === "client" && professional === "available") {
    return associationOwner && associationOwner === session?.usuario.id
      ? <Button asChild variant="ghost"><Link href="/acesso/vinculos">Acessar como cliente</Link></Button> : null;
  }
  // Login may return to a known client without an established professional session.
  const clientReturn = allowClientReturn && target === "client";
  if (client.state !== "available" || (!clientReturn && professional !== "available")) return null;
  const text = target === "client" ? "Acessar como cliente" : "Acessar área profissional";
  return <Button asChild variant="ghost"><Link href={"/app?context=" + target}>{text}</Link></Button>;
}
