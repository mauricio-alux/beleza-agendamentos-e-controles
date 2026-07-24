import type { MetadataRoute } from "next";
import { APP_BRAND, buildAppUrl } from "@/config/app-brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dashboard", "/configuracoes"]
    },
    sitemap: buildAppUrl("/sitemap.xml"),
    host: APP_BRAND.appUrl
  };
}
