import type { MetadataRoute } from "next";

import { getAbsoluteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/servicios", "/legal", "/contacto"].map((path) => ({
    url: getAbsoluteUrl(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
