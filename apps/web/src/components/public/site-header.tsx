"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/public/brand-mark";
import { HondurasClock } from "@/components/public/honduras-clock";
import { MobileNavigation } from "@/components/public/mobile-navigation";
import { WhatsappIcon } from "@/components/public/whatsapp-icon";
import { navigation, siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="brand" href="/" aria-label="Ir al inicio">
          <BrandMark />
          <span>
            <strong>DIACA</strong>
            <small>Asesoría Educativa</small>
          </span>
        </Link>
        <div className="desktop-site-menu">
          <nav className="main-nav" aria-label="Navegación principal">
            {navigation.map((item) => (
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <HondurasClock />
            <a
              className="whatsapp-button header-whatsapp"
              href={siteConfig.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Escribir por WhatsApp"
            >
              <WhatsappIcon />
            </a>
          </div>
        </div>
        <MobileNavigation pathname={pathname} />
      </div>
    </header>
  );
}
