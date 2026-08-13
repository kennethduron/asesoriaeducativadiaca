import Link from "next/link";

import { HeroCarousel } from "@/components/public/hero-carousel";
import { RequestSection } from "@/components/public/request-section";
import { ServiceGrid } from "@/components/public/service-grid";
import { WhatsappIcon } from "@/components/public/whatsapp-icon";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/site-config";
import { getAbsoluteUrl } from "@/lib/site-url";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService", "EducationalOrganization"],
  "@id": `${siteConfig.officialUrl}/#organization`,
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  url: `${siteConfig.officialUrl}/`,
  logo: `${siteConfig.officialUrl}/assets/favicon-512.png`,
  image: `${siteConfig.officialUrl}${siteConfig.openGraphImage}`,
  description: siteConfig.description,
  telephone: siteConfig.phoneE164,
  email: siteConfig.email,
  areaServed: { "@type": "Country", name: siteConfig.country },
  address: { "@type": "PostalAddress", addressCountry: "HN" },
  sameAs: [siteConfig.whatsappUrl],
  knowsAbout: [
    "Asesoría académica",
    "Tesis",
    "Normas APA 7",
    "Redacción profesional",
    "Trámites en Honduras",
    "Servicios legales civiles",
    "Comerciante individual",
    "Documentación legal",
    "Servicios digitales",
  ],
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Asesoría académica",
        description:
          "Apoyo para tesis, monografías, ensayos, informes, metodología, normas APA y revisión de redacción.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Servicios legales civiles",
        description:
          "Orientación para documentación, contratos, poderes, permisos, herencias y gestiones civiles.",
      },
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Trámites y registros",
        description:
          "Apoyo para ordenar requisitos, preparar documentos y dar seguimiento a trámites en Honduras.",
      },
    },
  ],
};

export default function HomePage() {
  const currentHome = getAbsoluteUrl("/");
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.officialUrl}/#website`,
    url: currentHome,
    name: siteConfig.name,
    inLanguage: siteConfig.language,
    publisher: { "@id": `${siteConfig.officialUrl}/#organization` },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: currentHome },
    ],
  };

  return (
    <main>
      <JsonLd data={[organizationJsonLd, websiteJsonLd, breadcrumbJsonLd]} />
      <section id="inicio" className="hero-section has-hero-carousel">
        <HeroCarousel />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Asesoría DIACA</p>
            <h1>Orientación académica, legal y profesional.</h1>
            <p className="hero-text">
              Apoyo claro para estudiar, gestionar documentos y resolver
              solicitudes con seguimiento.
            </p>
            <div className="hero-actions">
              <Link className="primary-link large" href="/contacto">
                Solicitar asesoría
              </Link>
              <Link className="secondary-link large" href="/servicios">
                Ver servicios
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="quienes-somos" className="about-section">
        <div className="about-copy" data-reveal>
          <p className="eyebrow">Quiénes somos</p>
          <h2>
            Orientación profesional para solicitudes académicas, civiles y
            administrativas.
          </h2>
          <p>
            DIACA brinda acompañamiento claro y ordenado a estudiantes,
            profesionales, emprendedores y familias en Honduras. Cada solicitud
            se revisa con atención al contexto, los documentos necesarios y los
            tiempos reales de entrega.
          </p>
        </div>
        <div className="about-proof" aria-label="Datos de confianza">
          <article data-reveal>
            <span>Honduras</span>
            <strong>Atención local</strong>
            <p>
              Servicios pensados para trámites, documentos y necesidades del
              país.
            </p>
          </article>
          <article data-reveal>
            <span>DIACA</span>
            <strong>Seguimiento ordenado</strong>
            <p>
              Comunicación directa, alcance definido y acompañamiento por
              WhatsApp.
            </p>
          </article>
          <article data-reveal>
            <span>Áreas</span>
            <strong>Apoyo integral</strong>
            <p>
              Asesoría académica, legal civil, redacción, tecnología y gestión
              profesional.
            </p>
          </article>
        </div>
      </section>

      <section id="servicios" className="section-block">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">Servicios principales</p>
          <h2>Apoyo integral para estudiantes, profesionales y negocios.</h2>
          <p>
            Organizamos los servicios de DIACA en áreas claras para que cada
            cliente encuentre rápidamente la ayuda que necesita: educación,
            derecho civil, redacción, tecnología, emprendimiento y finanzas.
          </p>
          <div className="section-actions">
            <Link className="primary-link" href="/servicios">
              Explorar servicios
            </Link>
            <Link className="secondary-link" href="/contacto">
              Solicitar asesoría
            </Link>
          </div>
        </div>
        <ServiceGrid />
      </section>

      <section id="legal" className="split-section">
        <div
          className="image-placeholder tall legal-visual"
          aria-hidden="true"
          data-reveal
        >
          <div>
            <span>DIACA</span>
            <strong>
              Asesoría civil y profesional con seguimiento ordenado.
            </strong>
          </div>
        </div>
        <div className="split-copy" data-reveal>
          <p className="eyebrow">Abogados DIACA</p>
          <h2>Servicios legales civiles y documentación profesional.</h2>
          <p>
            Atención para divorcios, matrimonios civiles, comerciantes
            individuales, constitución de empresas, contratos, herencias,
            poderes, permisos y asuntos familiares civiles.
          </p>
          <ul className="check-list">
            <li>No se tramitan casos penales.</li>
            <li>Asesoría para procesos civiles y documentación legal.</li>
            <li>Pagos por Banco Atlántida y Banpaís.</li>
          </ul>
          <div className="section-actions">
            <Link className="primary-link" href="/legal">
              Ver área legal
            </Link>
            <Link className="secondary-link" href="/contacto">
              Consultar caso
            </Link>
          </div>
        </div>
      </section>

      <section id="proceso" className="section-block compact">
        <div className="section-heading" data-reveal>
          <p className="eyebrow">Flujo de trabajo</p>
          <h2>Del primer mensaje a la entrega final.</h2>
          <div className="section-actions">
            <Link className="primary-link" href="/contacto">
              Iniciar solicitud
            </Link>
          </div>
        </div>
        <div className="process-grid">
          <article data-reveal>
            <span>01</span>
            <h3>Consulta</h3>
            <p>
              Recibimos la solicitud por mensaje directo y clasificamos el tipo
              de servicio.
            </p>
          </article>
          <article data-reveal>
            <span>02</span>
            <h3>Evaluación</h3>
            <p>
              Definimos alcance, costo estimado, documentos necesarios y fecha
              de entrega.
            </p>
          </article>
          <article data-reveal>
            <span>03</span>
            <h3>Seguimiento</h3>
            <p>
              El equipo da avances, confirma pagos y mantiene comunicación
              clara.
            </p>
          </article>
          <article data-reveal>
            <span>04</span>
            <h3>Entrega</h3>
            <p>
              Se entrega el trabajo final, se revisa satisfacción y se agenda
              soporte adicional.
            </p>
          </article>
        </div>
      </section>

      <RequestSection />

      <section id="contacto" className="contact-section">
        <div className="contact-copy" data-reveal>
          <p className="eyebrow">Contacto</p>
          <h2>Recibe orientación clara para tu solicitud.</h2>
          <p>
            Asesoría académica y apoyo en documentación legal profesional para
            Honduras. Agenda tu consulta y recibe orientación clara desde el
            primer mensaje.
          </p>
        </div>
        <div className="contact-actions" data-reveal>
          <a
            className="primary-link large icon-link"
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsappIcon />
            {siteConfig.phoneDisplay}
          </a>
          <a
            className="secondary-link large"
            href={`mailto:${siteConfig.email}`}
          >
            {siteConfig.email}
          </a>
          <a
            className="secondary-link large"
            href={`tel:${siteConfig.phoneE164}`}
          >
            Llamar ahora
          </a>
        </div>
      </section>
    </main>
  );
}
