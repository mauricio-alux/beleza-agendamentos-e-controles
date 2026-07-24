import type { MetadataRoute } from "next";
import { APP_BRAND } from "@/config/app-brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRAND.appName,
    short_name: APP_BRAND.appName,
    description: "Tecnologia elegante para profissionais da beleza.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f8",
    theme_color: "#e5687a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon"
      }
    ]
  };
}
