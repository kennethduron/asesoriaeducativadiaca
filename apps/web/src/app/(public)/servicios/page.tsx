import type { Metadata } from "next";
import Link from "next/link";

import { HeroCarousel } from "@/components/public/hero-carousel";
import { JsonLd } from "@/components/seo/json-ld";
import { serviceDetails } from "@/features/public-site/data/services";
import { createPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = createPageMetadata({
  title: "Servicios DIACA | Asesoría académica, trámites y redacción",
  description:
    "Servicios DIACA en Honduras: asesoría académica, tesis, redacción profesional, trámites, registros, tecnología, emprendimiento y finanzas.",
  path: "/servicios",
});

export default function ServicesPage() {
  const url = getAbsoluteUrl("/servicios");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#services`,
      url,
      name: "Servicios de Asesoría Educativa DIACA",
      description:
        "Servicios de asesoría académica, redacción profesional, trámites, tecnología, emprendimiento y finanzas en Honduras.",
      inLanguage: siteConfig.language,
      isPartOf: { "@id": `${siteConfig.officialUrl}/#website` },
      about: serviceDetails.map((service) => ({
        "@type": "Service",
        name: service.title,
      })),
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
        { "@type": "ListItem", position: 2, name: "Servicios", item: url },
      ],
    },
  ];

  return (
    <main>
      <JsonLd data={jsonLd} />
      <section className="page-hero services-page-hero has-hero-carousel">
        <HeroCarousel />
        <div className="page-hero-inner">
          <p className="eyebrow">Servicios DIACA</p>
          <h1>Servicios para avanzar con claridad.</h1>
          <p>
            Apoyo académico, redacción, trámites y orientación profesional con
            seguimiento.
          </p>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">Áreas de trabajo</p>
          <h2>
            Servicios claros, con alcance definido desde la primera consulta.
          </h2>
        </div>
        <div className="service-detail-grid">
          {serviceDetails.map((service) => (
            <article className="detail-card" data-reveal key={service.number}>
              <span>{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul>
                {service.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <Link className="card-link" href="/contacto">
                Solicitar este servicio
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="cta-band" data-reveal>
        <div>
          <p className="eyebrow">Atención personalizada</p>
          <h2>Recibe una orientación inicial según tu necesidad.</h2>
        </div>
        <Link className="primary-link large" href="/contacto">
          Solicitar asesoría
        </Link>
      </section>
    </main>
  );
}
