import { siteConfig } from "@/lib/site-config";

const withProtocol = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;

const normalizeUrl = (value: string) => withProtocol(value).replace(/\/$/, "");

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }

  if (process.env.VERCEL_URL) {
    return normalizeUrl(process.env.VERCEL_URL);
  }

  return "http://localhost:3000";
}

export function getAbsoluteUrl(path = "/"): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}

export function isIndexableEnvironment(): boolean {
  if (!process.env.VERCEL_ENV) {
    return true;
  }

  if (process.env.VERCEL_ENV !== "production") {
    return false;
  }

  return (
    new URL(getSiteUrl()).hostname === new URL(siteConfig.officialUrl).hostname
  );
}
