import Link from "next/link";

import { BrandMark } from "@/components/public/brand-mark";
import { navigation, siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <strong>{siteConfig.name}</strong>
            <p>
              Apoyo académico, legal civil, profesional y digital para Honduras.
            </p>
          </div>
        </div>
        <nav className="footer-links" aria-label="Enlaces del sitio">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label === "Legal" ? "Legal civil" : item.label}
            </Link>
          ))}
        </nav>
        <div className="footer-contact" aria-label="Contacto DIACA">
          <span>Atención directa</span>
          <a href={`tel:${siteConfig.phoneE164}`}>{siteConfig.phoneDisplay}</a>
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <a href={siteConfig.whatsappUrl} target="_blank" rel="noreferrer">
            WhatsApp DIACA
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 {siteConfig.name}. Todos los derechos reservados.</span>
        <span>Servicios profesionales con seguimiento claro y ordenado.</span>
      </div>
    </footer>
  );
}
