import type { Metadata, Viewport } from "next";

import { ToastProvider } from "@/components/ui/toast";
import { createPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const baseMetadata = createPageMetadata({
  title: "Asesoría Educativa DIACA Honduras",
  description:
    "Asesoría Educativa DIACA en Honduras: apoyo académico, redacción profesional, trámites, orientación legal civil, documentos y servicios digitales.",
  path: "/",
});

export const metadata: Metadata = {
  ...baseMetadata,
  metadataBase: new URL(getSiteUrl()),
  title: {
    default:
      "Asesoría Educativa DIACA Honduras | Asesoría académica, legal civil y trámites",
    template: "%s | DIACA Honduras",
  },
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "Servicios profesionales",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/assets/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/assets/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/assets/favicon-96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/assets/favicon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "geo.region": "HN",
    "geo.placename": "Honduras",
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const socialImage = getAbsoluteUrl(siteConfig.openGraphImage);

  return (
    <html lang={siteConfig.language} data-scroll-behavior="smooth">
      <head>
        <link rel="image_src" href={socialImage} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
