import type { Metadata } from "next";

import { HeroCarousel } from "@/components/public/hero-carousel";
import { RequestSection } from "@/components/public/request-section";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = createPageMetadata({
  title: "Contacto DIACA | Solicitar asesoría",
  description:
    "Contacta a Asesoría Educativa DIACA en Honduras. Solicita apoyo académico, legal civil, redacción, trámites o servicios digitales por WhatsApp.",
  path: "/contacto",
});

export default function ContactPage() {
  const url = getAbsoluteUrl("/contacto");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "@id": `${url}#contact`,
      url,
      name: "Contacto DIACA",
      description:
        "Formulario de contacto para solicitar asesoría académica, legal civil, redacción, trámites y servicios digitales.",
      inLanguage: siteConfig.language,
      mainEntity: { "@id": `${siteConfig.officialUrl}/#organization` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: getAbsoluteUrl("/"),
        },
        { "@type": "ListItem", position: 2, name: "Contacto", item: url },
      ],
    },
  ];

  return (
    <main>
      <JsonLd data={jsonLd} />
      <section className="page-hero contact-page-hero has-hero-carousel">
        <HeroCarousel />
        <div className="page-hero-inner">
          <p className="eyebrow">Contacto DIACA</p>
          <h1>Envía tu solicitud a DIACA.</h1>
          <p>Comparte lo esencial y el equipo dará seguimiento pronto.</p>
        </div>
      </section>
      <RequestSection compactCopy />
    </main>
  );
}
