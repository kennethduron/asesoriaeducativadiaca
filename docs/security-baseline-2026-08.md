# DIACA security baseline — 2026-08-13

## Scope and traceability

- Repository: Asesoría Educativa DIACA.
- Base branch: `main`.
- Base SHA: `d62468716fdd9d49ea0323c1983602f9f24fe05e`.
- Work branch: `hotfix/crm-security-baseline`.
- Scope: containment, read-only inventory, backup, and hardening of the existing static site, CRM, and serverless APIs.
- Out of scope: Next.js, the new portfolio/payment module, financial migrations, and destructive production changes.

## Vulnerabilities corrected

1. Stored XSS through `priority`:
   - The public API previously accepted arbitrary values after converting them to strings.
   - The CRM interpolated `priority` and some statuses directly into HTML class attributes.
   - The API now accepts only the priorities and services already supported by DIACA.
   - The CRM now selects CSS classes from internal maps; external values are escaped only as visible text.
2. Public lead input:
   - Scalar type and maximum-length validation.
   - Phone-format validation.
   - Unknown-field rejection, with a temporary allowlist for the known legacy payload during rollout.
   - 16 KiB body limit and HTTP 413.
   - Honeypot on both public forms.
   - Generic server errors without SQL/Supabase details or returned lead PII.
3. CORS:
   - CORS now fails closed and emits `Access-Control-Allow-Origin` only for configured origins.
4. Authentication fallback:
   - Demo authentication can run only on localhost, loopback, or `file:` development contexts.
   - Missing Supabase configuration in production now fails closed.
5. HTTP methods and errors:
   - Unsupported methods return 405 and an `Allow` header.
   - Administrative APIs no longer return backend error details.
6. Hosting headers:
   - Added `X-Frame-Options: DENY` and a restrictive `Permissions-Policy` to Firebase and Vercel.
   - A full CSP is deferred because the current application uses inline JSON-LD, Google Fonts, Firebase CDN scripts, and Firebase Messaging. It requires tested hashes/nonces to avoid breaking production.
7. Cross-platform asset path:
   - Git now records `assets/cristian.jpg`, matching every code reference and Linux/Vercel path resolution.
8. Hosting containment:
   - Firebase Hosting explicitly excludes `docs/` and `tests/` in addition to server/configuration paths.
   - Vercel packaging excludes Git metadata, environment files, Firebase configuration, technical documentation, tests, and Supabase schema files while preserving the current API functions.

## Production inventory (no PII)

Inventory source: read-only Supabase REST and Auth Admin APIs using existing production credentials. No records were inserted, updated, or deleted.

| Table | Count | Earliest | Latest | Distinct operational values | Critical nulls | Approx. JSON bytes |
| --- | ---: | --- | --- | --- | --- | ---: |
| `crm_admins` | 3 | 2026-04-30T01:47:03.645Z | 2026-05-02T22:59:11.686Z | — | 0 | 507 |
| `leads` | 0 | — | — | status: none; priority: none | 0 | 2 |
| `clients` | 0 | — | — | status: none | 0 | 2 |
| `cases` | 0 | — | — | stage: none | 0 | 2 |
| `tasks` | 13 | 2026-05-02T23:10:48.410Z | 2026-05-04T11:24:22.311Z | `done=true` | 0 | 2,167 |
| `payments` | 0 | — | — | method: none | 0 | 2 |
| `push_tokens` | 9 | 2026-05-01T12:15:50.060Z | 2026-05-05T04:29:12.665Z | — | 0 | 4,177 |

Additional observations:

- Supabase Auth users: 3.
- Duplicate primary IDs detected: 0.
- Invalid UUID IDs detected in UUID-backed tables: 0.
- There is no reliable field that distinguishes demo data from real data. The inventory therefore does not make that classification.
- Production currently contains no payment rows; no financial record was changed.

## Backup

- Method: application-level, read-only export through Supabase REST and Auth Admin APIs.
- Schema included: current versioned `supabase/schema.sql`.
- Tables included: `crm_admins`, `leads`, `clients`, `cases`, `tasks`, `payments`, and `push_tokens`.
- Auth included: permitted user metadata only; no password hashes.
- Local path: `C:\Users\user\AppData\Local\Temp\diaca-security-baseline-2026-08-13\diaca-production-application-backup-2026-08-13T14-39-31-019Z.json`.
- Size: 17,325 bytes.
- SHA-256: `2c4a2f41a97c07970f4cb9b3843ddf7fb9ba0ab00255d9ba970cfb0b4954d017`.
- JSON parse validation: passed.
- Expected-table validation: passed.
- Restore test: not performed. There is no isolated PostgreSQL/Supabase instance, `pg_dump`/`psql`, Supabase CLI link, or database password available.
- Limitation: this is not a `pg_dump`; database roles and unversioned database objects are not captured beyond the repository schema.
- Git status: the backup is outside the repository and must never be added to Git.

The temporary Vercel environment file used for this operation was deleted after the inventory. The backup remains in the user-specific temporary directory and contains private administrative data; it must be moved to DIACA's approved encrypted backup location or securely removed after a replacement official dump exists.

## Required environment variables

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`
- `PUBLIC_APP_URL`
- `CRON_SECRET`

Production environment remediation completed during the baseline:

- The Vercel project contained empty current values for `ALLOWED_ORIGINS`, `PUBLIC_APP_URL`, and `CRON_SECRET`, even though the previous immutable deployment behaved as if older values had been captured.
- All three production variables were set before deployment. `CRON_SECRET` was replaced with a new cryptographically random value and was never printed or stored in the repository.
- Production origins are limited to the canonical domain, `www`, the Firebase Hosting domain, and the existing productive Vercel domain while it continues serving the current application/APIs. Localhost belongs only in Development/Preview configuration.

## Historical exposure and credential review

The first Firebase deployment manifest included `.git`, Git objects, Git refs, `README.md`, `package.json`, and `vercel.json`. Later manifests and the current `firebase.json` exclude those files. Current public probes return 404 for `.git/config`.

Classification:

- Public by design: HTML, CSS, client JavaScript, Firebase web config, Supabase publishable key, VAPID public key, images, metadata.
- Internal but not secret: `.git` metadata/history, remote repository URL, README, package manifest, Vercel routing config.
- Server secrets: Supabase service role, Firebase private key, and cron secret. No current value for these secrets was found literally in Git history; `.env` was not tracked and `firebase-debug.log` was not published according to the manifests inspected.

Actions:

- `CRON_SECRET` was rotated and installed in Vercel Production before deployment.
- Supabase service role and Firebase service-account key do not show evidence of Git/Hosting exposure. Schedule rotation if DIACA policy requires precautionary rotation, but do not revoke them before new credentials are installed and verified in Vercel.
- Restrict public Firebase/Supabase keys by their supported domain/API controls; public keys are not authorization controls.

## Browser storage inventory and administrator guide

| Storage | Key | Contents | Risk |
| --- | --- | --- | --- |
| `localStorage` | `diaca-crm-state` | Cached leads, clients, cases, tasks, notes, phones, and values | May contain real operational/PII data not present in current Supabase tables. |
| `localStorage` or `sessionStorage` | `diaca-crm-session` | Email/name plus Supabase access and refresh tokens when remote Auth is used | High if XSS or device access occurs. |
| `localStorage` | `diaca-crm-push-last-sync` | Last push-token synchronization timestamp | Low. |

Manual review on every real administrator browser:

1. Open the production CRM in the normal browser profile.
2. Open Developer Tools → Application/Storage.
3. Inspect Local Storage and Session Storage for the production origin and the three keys above.
4. Do not paste raw values into tickets, chat, Git, screenshots, or this repository.
5. Record only whether each key exists, the approximate record counts inside `diaca-crm-state`, and whether that state contains records absent from Supabase.
6. If unique records exist, export them to an approved encrypted location and reconcile them before migration.
7. Do not clear browser storage yet. Session migration and token storage move to Phase 2.

## Risks still pending

- Distributed rate limiting is not implemented: the current project has no Redis/Upstash service, database rate-limit table, or confirmed Vercel WAF configuration. An in-memory limiter would be incorrect on serverless. Honeypot, strict validation, body limit, and fail-closed CORS are active mitigations.
- Session tokens can still be persisted in `localStorage` when “Mantener sesión” is selected. Changing persistence now could interrupt users; move sessions to secure server-managed cookies in Phase 2.
- Full CSP is pending the Next.js migration or a separately tested hash/nonce project.
- No isolated database exists for a real restore test.
- A full official PostgreSQL dump remains pending database credentials/tooling.
- Manual browser-storage review remains an operational task for DIACA administrators.

## Phase 1 prerequisites

Phase 1 may start after:

1. This hotfix passes preview/production verification.
2. `ALLOWED_ORIGINS`, `PUBLIC_APP_URL`, and the rotated `CRON_SECRET` remain safely set in Vercel.
3. The hotfix is merged and production remains stable.
4. DIACA completes or accepts the documented browser-storage review.
5. The application backup is moved to approved protected storage, with an official `pg_dump` scheduled when database access is available.

Then create `feat/diaca-client-portfolio` and scaffold `apps/web` without moving the production domain from Firebase.
