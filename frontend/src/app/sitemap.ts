import type { MetadataRoute } from "next";
import { buildAppUrl } from "@/config/app-brand";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: buildAppUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: buildAppUrl("/cadastro"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: buildAppUrl("/login"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5
    }
  ];
}
