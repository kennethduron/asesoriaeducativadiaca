import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";
const isVercelStaging =
  Boolean(process.env.VERCEL_ENV) &&
  process.env.DIACA_PUBLIC_PRODUCTION !== "true";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://oauth2.googleapis.com https://fcm.googleapis.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const commonSecurityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/servicios.html", destination: "/servicios", permanent: true },
      { source: "/legal.html", destination: "/legal", permanent: true },
      { source: "/contacto.html", destination: "/contacto", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...commonSecurityHeaders,
          ...(isVercelStaging
            ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
            : []),
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
        ],
      },
      {
        source: "/login",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/recuperar-contrasena",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/restablecer-contrasena",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
