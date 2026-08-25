"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navigation, siteConfig } from "@/lib/site-config";

type MobileNavigationProps = {
  pathname: string;
};

export function MobileNavigation({ pathname }: MobileNavigationProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="menu-toggle"
          variant="ghost"
          size="icon"
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="mobile-sheet"
        aria-describedby="mobile-navigation-description"
      >
        <SheetTitle className="mobile-sheet-title">Navegación DIACA</SheetTitle>
        <SheetDescription
          id="mobile-navigation-description"
          className="sr-only"
        >
          Enlaces principales y contacto de Asesoría Educativa DIACA.
        </SheetDescription>
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {navigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <SheetClose asChild>
          <a
            className="primary-link mobile-whatsapp"
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
