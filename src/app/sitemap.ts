import type { MetadataRoute } from "next";
import { FEATURED_COMPETITIONS } from "@/lib/competitions";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/live", "/matches", "/competitions", "/transfers", "/news", "/injuries", "/search", "/favorites", "/settings"];
  return [
    ...routes.map((route) => ({ url: `https://sheko.sports${route}`, lastModified: now })),
    ...FEATURED_COMPETITIONS.map((comp) => ({ url: `https://sheko.sports/competitions/${comp.id}`, lastModified: now })),
  ];
}
