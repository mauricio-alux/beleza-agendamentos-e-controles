import { AppEntry } from "@/components/app/AppEntry";
import { Suspense } from "react";

export default function AppPage() {
  return <Suspense fallback={<p>Preparando seu acesso...</p>}><AppEntry /></Suspense>;
}
