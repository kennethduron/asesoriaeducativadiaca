import type { Metadata } from "next";

import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl, isIndexableEnvironment } from "@/lib/site-url";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataInput): Metadata {
  const canonical = getAbsoluteUrl(path);
  const image = getAbsoluteUrl(siteConfig.openGraphImage);
  const indexable = isIndexableEnvironment();

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        "es-HN": canonical,
        "x-default": canonical,
      },
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.name,
      title,
      description,
      url: canonical,
      images: [
        {
          url: image,
          secureUrl: image,
          type: "image/jpeg",
          width: siteConfig.openGraphImageWidth,
          height: siteConfig.openGraphImageHeight,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: siteConfig.name }],
    },
  };
}
