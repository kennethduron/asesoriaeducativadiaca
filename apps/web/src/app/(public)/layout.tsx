import { ScrollReveal } from "@/components/public/scroll-reveal";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { WhatsappCta } from "@/components/public/whatsapp-cta";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <WhatsappCta />
      {children}
      <SiteFooter />
      <ScrollReveal />
    </div>
  );
}
