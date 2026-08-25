import type { MetadataRoute } from "next";

import { getAbsoluteUrl, isIndexableEnvironment } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableEnvironment()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
