import type { MetadataRoute } from "next";

export const PWA_START_URL = "/acesso";
export const PWA_SCOPE = "/";
export const PWA_THEME_COLOR = "#e5687a";
export const PWA_BACKGROUND_COLOR = "#fff8f8";

type PwaManifestInput = {
  appName: string;
  shortName?: string | null;
};

function normalizeBrandName(value: string | null | undefined, fallback = "Plataforma") {
  const normalized = value?.trim();
  return normalized || fallback;
}

export function buildPwaManifest({ appName, shortName }: PwaManifestInput): MetadataRoute.Manifest {
  const name = normalizeBrandName(appName);
  const short_name = normalizeBrandName(shortName, name);

  return {
    name,
    short_name,
    description: `Acesso rapido aos seus horarios e agendamentos no ${name}.`,
    start_url: PWA_START_URL,
    scope: PWA_SCOPE,
    display: "standalone",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    icons: [
      {
        src: "/icons/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
