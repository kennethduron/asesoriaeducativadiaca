import type { Metadata } from "next";
import Link from "next/link";

import { HeroCarousel } from "@/components/public/hero-carousel";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = createPageMetadata({
  title: "Servicios legales civiles y documentación",
  description:
    "Orientación legal civil DIACA en Honduras para documentación, contratos, poderes, permisos, herencias, divorcios civiles y trámites relacionados.",
  path: "/legal",
});

export default function LegalPage() {
  const url = getAbsoluteUrl("/legal");
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: "Servicios legales civiles y documentación",
      provider: { "@id": `${siteConfig.officialUrl}/#organization` },
      areaServed: { "@type": "Country", name: siteConfig.country },
      description:
        "Orientación para documentación civil, contratos, poderes, permisos, herencias, divorcios civiles y trámites relacionados.",
      url,
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
        { "@type": "ListItem", position: 2, name: "Legal Civil", item: url },
      ],
    },
  ];

  return (
    <main>
      <JsonLd data={jsonLd} />
      <section className="page-hero legal-page-hero has-hero-carousel">
        <HeroCarousel />
        <div className="page-hero-inner">
          <p className="eyebrow">Abogados DIACA</p>
          <h1>Orientación legal civil y documentación.</h1>
          <p>
            Revisión clara de requisitos, alcance y pasos para gestiones
            civiles.
          </p>
        </div>
      </section>
      <section className="split-section">
        <div
          className="legal-visual image-placeholder tall"
          aria-hidden="true"
          data-reveal
        >
          <div>
            <span>DIACA LEGAL</span>
            <strong>
              Análisis, requisitos y seguimiento para cada gestión civil.
            </strong>
          </div>
        </div>
        <div className="split-copy" data-reveal>
          <p className="eyebrow">Alcance legal</p>
          <h2>Atención enfocada en asuntos civiles y documentación.</h2>
          <p>
            El objetivo es que cada cliente sepa qué documentos necesita, qué
            pasos siguen y cómo se dará seguimiento a su solicitud.
          </p>
          <ul className="check-list">
            <li>
              Divorcios, matrimonios civiles y asuntos familiares civiles.
            </li>
            <li>
              Contratos, herencias, poderes, permisos y documentación legal.
            </li>
            <li>Constitución de empresas y comerciante individual.</li>
            <li>No se tramitan casos penales.</li>
          </ul>
          <div className="section-actions">
            <Link className="primary-link" href="/contacto">
              Consultar caso civil
            </Link>
            <Link className="secondary-link" href="/servicios">
              Ver otros servicios
            </Link>
          </div>
        </div>
      </section>
      <section className="section-block compact">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">Proceso legal</p>
          <h2>Un flujo simple para evitar confusión.</h2>
          <div className="section-actions">
            <Link className="primary-link" href="/contacto">
              Solicitar orientación
            </Link>
          </div>
        </div>
        <div className="timeline-list">
          <article data-reveal>
            <span>01</span>
            <h3>Consulta inicial</h3>
            <p>
              Se revisa el tipo de gestión, urgencia y documentos disponibles.
            </p>
          </article>
          <article data-reveal>
            <span>02</span>
            <h3>Requisitos</h3>
            <p>
              Se confirma qué información hace falta antes de iniciar cualquier
              trámite.
            </p>
          </article>
          <article data-reveal>
            <span>03</span>
            <h3>Preparación</h3>
            <p>
              Se ordena la documentación y se define el alcance del servicio.
            </p>
          </article>
          <article data-reveal>
            <span>04</span>
            <h3>Seguimiento</h3>
            <p>Se informa el avance y los siguientes pasos hasta la entrega.</p>
          </article>
        </div>
      </section>
      <section className="cta-band" data-reveal>
        <div>
          <p className="eyebrow">Consulta civil</p>
          <h2>Describe tu caso y recibe orientación inicial.</h2>
        </div>
        <Link className="primary-link large" href="/contacto">
          Solicitar revisión
        </Link>
      </section>
    </main>
  );
}
