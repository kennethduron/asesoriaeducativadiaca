# Phase 1 Next.js foundation

## Purpose and isolation

`apps/web` is the isolated replacement candidate for the DIACA public site. It does not replace Firebase Hosting, the public production domain, the legacy CRM, Supabase authentication/data, Firebase Messaging, or the existing Vercel API project.

## Architecture

- Next.js App Router with React Server Components by default.
- TypeScript strict mode and the `@/*` source alias.
- Tailwind CSS v4 for the design system foundation.
- shadcn/ui using the Radix base for accessible Button, Input, Textarea, and Sheet primitives.
- Client Components only for the hero carousel, mobile navigation, Honduras clock, scroll reveal, and contact form.
- Static content and metadata remain Server Components.
- Zod defines the shared lead contract for browser and proxy validation.
- A same-origin Route Handler forwards valid requests to the existing hardened leads API, avoiding broad preview CORS allowances.

## Relevant structure

```text
apps/web/
├── public/
│   ├── assets/
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── api/leads/route.ts
│   │   ├── contacto/page.tsx
│   │   ├── legal/page.tsx
│   │   ├── servicios/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── public/
│   │   ├── seo/
│   │   └── ui/
│   ├── features/public-site/data/
│   ├── lib/
│   │   ├── leads/
│   │   ├── seo/
│   │   └── validation/
│   └── styles/public-site.css
├── .env.example
├── components.json
├── next.config.ts
└── package.json
```

## Dependencies and decisions

- Next.js and React provide routing, rendering, metadata, and deployment integration.
- Tailwind is initialized without translating the legacy stylesheet into large `@apply` blocks.
- shadcn/Radix is limited to interactive controls and restyled with DIACA tokens.
- Zod mirrors the hardened `/api/leads` fields, enum values, and length limits.
- Prettier, ESLint flat config, and TypeScript provide deterministic quality checks.
- No CRM, Supabase SSR, charting, spreadsheet, PDF, email, observability, or test-runner dependencies were added.

## Public routes

| Route        | Source migrated  | Canonical route |
| ------------ | ---------------- | --------------- |
| `/`          | `index.html`     | `/`             |
| `/servicios` | `servicios.html` | `/servicios`    |
| `/legal`     | `legal.html`     | `/legal`        |
| `/contacto`  | `contacto.html`  | `/contacto`     |

The new application permanently redirects `/servicios.html`, `/legal.html`, and `/contacto.html` with HTTP 308 responses. Firebase redirect behavior is unchanged until cutover.

## SEO and environment behavior

Metadata is centralized through `createPageMetadata()` and `getSiteUrl()`. The URL resolver considers `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, and localhost. Page metadata includes canonical URLs, Open Graph, X/Twitter, locale, alternate language links, icons, and the approved `opengraph-v2.jpg`.

`robots.ts` disallows preview indexing. A Vercel deployment becomes indexable only when it is a production deployment whose configured site hostname is the official DIACA hostname. This prevents the isolated Vercel project from competing with the current Firebase production site. Local development remains usable.

JSON-LD is serialized by one safe component that escapes `<` before insertion. Organization, WebSite, service, collection, contact, and breadcrumb data are migrated without adding reviews, ratings, awards, or locations.

## Assets

Only public assets used by the migrated site were copied: the three desktop and three mobile carousel photographs, the approved Open Graph image, WhatsApp icon, favicon sizes, root favicon, and manifest. Source filenames and bytes remain unchanged. `opengraph-v2.jpg` and the approved favicon were not regenerated.

## Lead integration

The browser submits to `/api/leads` on the new app. The Route Handler validates the payload again and forwards it to `LEADS_API_URL`. This is the safer preview strategy because it avoids authorizing a wildcard `*.vercel.app` origin on the production API.

Accepted fields are `name`, `phone`, `service`, `priority`, `message`, and `organization_site`. The honeypot remains off-screen, excluded from the tab order, and limited to 200 characters. Pending state disables the submit button, field errors are announced and linked to controls, and upstream details are replaced with generic errors.

## Environment variables

| Variable               | Exposure    | Purpose                                                           |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | Public      | Absolute site URL for metadata and sitemap generation.            |
| `LEADS_API_URL`        | Server only | Existing production leads endpoint used by the same-origin proxy. |

No Supabase service role, Firebase private key, cron secret, or other secret is required by the public application.

## Vercel strategy

Create a separate Vercel project, suggested name `asesoriaeducativadiaca-next`, with Root Directory `apps/web`. Configure the two environment variables above per environment. Do not reuse `asesoriaeducativadiaca-bih6`, connect `asesoriaeducativadiaca.com`, or alter Firebase Hosting during Phase 1.

Preview deployments should remain noindex. Deployment Protection may be enabled if it does not block the owner’s review workflow.

## Security baseline

`next.config.ts` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and a restrictive `Permissions-Policy`. The proxy accepts only POST through its exported handler, validates the exact payload, applies a 12-second upstream timeout, stores no secrets or leads, and returns generic errors. A full CSP and distributed rate limiting remain documented risks.

## CI and branch protection

`.github/workflows/web-ci.yml` uses pinned action commits and runs frozen install, lint, formatting, typecheck, and build checks. Branch protection should require this workflow before merging to `main`.

## Rollback

Phase 1 has no production cutover. Rollback is therefore to stop or remove the isolated Vercel project and abandon/revert the feature branch. Firebase Hosting, the official domain, legacy CRM, existing Vercel APIs, Supabase data, and Firebase Messaging continue independently.

## Deferred work

- The four Phase 0B risks tracked in `phase-1-known-risks.md`.
- Full CSP coordination.
- Durable server-side idempotency.
- Phase 2 development Supabase environment, Auth, profiles, roles, permissions, RLS, and audit logs.
- All financial, portfolio, reporting, and administrative modules.
