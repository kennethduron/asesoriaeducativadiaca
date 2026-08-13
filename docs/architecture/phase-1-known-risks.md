# Phase 1 known risks

## Scope

This register keeps the high-priority Phase 0B findings visible while the public Next.js site is developed in isolation. Phase 1 does not claim to remediate authentication, CRM storage, database recovery, or distributed abuse controls.

## Outstanding Phase 0B risks

### High — Official PostgreSQL backup and restore exercise

An official PostgreSQL backup process and a documented, tested restore exercise are still required. The public-site migration does not change the production Supabase schema or data.

### High — Manual `localStorage` review

The legacy CRM still requires a manual inventory of values persisted in `localStorage`, their retention, and whether any value is sensitive. The public Next.js application does not read or write the legacy CRM storage.

### High — Distributed rate limiting

The production APIs still require a distributed rate limiter suitable for multiple serverless instances. Client-side validation, the honeypot, and UI double-submit prevention do not replace server-side rate limiting.

### High — Session tokens in `localStorage`

The legacy authentication flow still stores session material in `localStorage`. This will be addressed with the future authentication and authorization design, not in the public-site phase.

## Phase 1-specific risks

### Medium — Temporary dependency on the legacy leads API

The new form depends on the existing production leads API through a same-origin Next.js proxy. API downtime or contract changes affect lead submission even when the public pages remain available.

### Medium — Content Security Policy deferred

Baseline response headers are enabled. A full CSP remains deferred until the later authentication, messaging, and API integration boundaries are finalized.

### Low — Preview environment configuration

Preview deployments require `NEXT_PUBLIC_SITE_URL` and `LEADS_API_URL`. Missing values do not expose secrets, but metadata falls back to the Vercel host and lead submission returns a generic unavailable response.

### Low — Server-side idempotency

The UI blocks duplicate submissions while a request is pending. The existing API does not expose an idempotency-key contract, so durable server-side idempotency remains a future improvement.
