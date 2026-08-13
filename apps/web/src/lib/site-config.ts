export const siteConfig = {
  name: "Asesoría Educativa DIACA",
  shortName: "DIACA",
  description:
    "Asesoría académica, redacción profesional, trámites, orientación legal civil y servicios digitales en Honduras.",
  officialUrl: "https://asesoriaeducativadiaca.com",
  locale: "es_HN",
  language: "es-HN",
  country: "Honduras",
  email: "asesoriaeducativadiaca@gmail.com",
  phoneDisplay: "+504 9818-5221",
  phoneE164: "+50498185221",
  whatsappUrl: "https://wa.me/50498185221",
  openGraphImage: "/assets/opengraph-v2.jpg",
  openGraphImageWidth: 877,
  openGraphImageHeight: 877,
} as const;

export const navigation = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/legal", label: "Legal" },
  { href: "/contacto", label: "Contacto" },
] as const;
