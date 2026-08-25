# DIACA Web

Aplicacion Next.js aislada para el sitio publico de Asesoria Educativa DIACA.

## Desarrollo local

Desde la raiz del repositorio:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @diaca/web dev
```

La aplicacion queda disponible en `http://localhost:3000`. Copia `.env.example`
como `.env.local` si necesitas cambiar la URL publica o el backend de leads.

## Comprobaciones

```bash
pnpm --filter @diaca/web lint
pnpm --filter @diaca/web format:check
pnpm --filter @diaca/web typecheck
pnpm --filter @diaca/web build
```

La arquitectura, variables, estrategia de despliegue y rollback se documentan en
`docs/architecture/phase-1-nextjs-foundation.md`.
