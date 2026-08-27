# Fase 2: Auth, RBAC, RLS y auditoría

## Alcance y dependencia

Fase 2 se construye en `feat/diaca-auth-rbac` sobre el HEAD publicado de Fase 1 (`4e1775bad398e31e6311e5d97d166a77e3d048f6`). Ese commit no estaba contenido en `main` al iniciar el trabajo, por lo que las ramas deben integrarse en orden: Fase 1 y después Fase 2.

Esta fase no crea cartera, cargos, pagos, recibos, estados de cuenta, reportes financieros ni datos reales. Firebase Hosting, el CRM legado, el dominio oficial, el Supabase productivo y el proyecto Vercel legado quedan fuera del alcance.

## Arquitectura

```text
Browser
  │ cookies administradas por @supabase/ssr
  ▼
Next.js Server / proxy.ts
  │ identidad validada con getClaims/getUser
  ▼
Supabase Auth
  │ JWT → auth.uid()
  ▼
PostgreSQL RLS
  │
  ▼
Tablas y funciones públicas controladas
```

```text
auth.users
    │ 1:1
    ▼
profiles ─────────────────────────────► audit_logs
    │
    ▼
roles
    │
    ▼
role_permissions
    │
    ▼
permissions
```

La autenticación demuestra identidad. La autorización consulta el perfil activo y sus permisos. Ocultar una opción en la UI es únicamente UX; RLS y las funciones PostgreSQL siguen siendo el límite de seguridad.

## Supabase Development

- Tipo: entorno local reproducible y proyecto cloud DEVELOPMENT separado.
- ID local: `diaca-development`.
- Proyecto cloud DEV: `diaca-development`, ref `jowbnimjujbllqclpdyq`, región `us-east-2` y URL `https://jowbnimjujbllqclpdyq.supabase.co`.
- PostgreSQL: major 17; la imagen local reportada por CLI es PostgreSQL 17.6 y el proyecto cloud fue creado con major 17.
- CLI fijada: `supabase@2.115.0` como dependencia de desarrollo del workspace.
- Puertos dedicados: API 55321, DB 55322, shadow DB 55320, Studio 55323 y Mailpit 55324. Se evita interferir con otro stack local que usa el rango estándar.
- `supabase/schema.sql` permanece solo como referencia histórica y no forma parte de `schema_paths`.
- Fuente de verdad: `supabase/migrations/`.
- Las cinco migrations fueron aplicadas al cloud DEV; `supabase migration list --linked` reporta la misma historia local/remota y `supabase db diff --linked --schema public` no produce SQL pendiente.
- Solo la URL y la clave publicable viven en variables Development/Preview de Vercel. La clave administrativa se usó efímeramente para provisioning y nunca se configuró en la app.

El proyecto productivo heredado no fue enlazado, consultado para escritura ni reutilizado. Las credenciales del cloud DEV no se documentan ni se versionan.

## Migrations

1. `20260824090000_create_identity_and_rbac.sql`: tablas, constraints, índices, timestamps y trigger `auth.users → profiles`.
2. `20260824090100_seed_rbac_contract.sql`: cuatro roles, 17 permisos y asignaciones mínimas.
3. `20260824090200_create_audit_and_security_functions.sql`: auditoría, `has_permission`, principal actual, guards y bootstrap inicial.
4. `20260824090300_enable_rls_and_grants.sql`: RLS forzada, grants explícitos y policies separadas por operación.
5. `20260824090400_harden_service_role_grants.sql`: revoca defaults cloud amplios y limita `service_role` al provisioning documentado.

`supabase db reset` aplica las cinco migrations y después `seed.sql`. Los catálogos RBAC viven en migration para que un proyecto remoto nuevo también reciba el contrato; `seed.sql` documenta que no admite credenciales ni datos reales.

## Identidad y provisioning

`auth.users` es la identidad y `profiles.id` usa el mismo UUID. Un trigger crea cada perfil con rol `staff` y estado `inactive`; metadata ausente no rompe el alta y el nombre se limita a 120 caracteres. El alta pública está bloqueada globalmente tanto en la configuración local como en Auth cloud DEV. `auth.email.enable_signup=true` mantiene disponible el proveedor de correo local, mientras `auth.enable_signup=false` impide el registro. En cloud se deshabilitó **Allow new users to sign up** después de crear los usuarios sintéticos mediante la API administrativa.

El primer owner se promueve una sola vez con `bootstrap_initial_owner(uuid)`. Solo `service_role` puede ejecutar la función y deja de funcionar cuando ya existe un owner activo. La clave administrativa se usa únicamente por el script explícito `apps/web/scripts/provision-dev-users.mjs`, que exige `SUPABASE_DEV_SECRET_KEY` y `DIACA_TEST_PASSWORD` desde el entorno. Ninguna contraseña vive en Git.

## Sesiones SSR

- `@supabase/ssr@0.12.5` y `@supabase/supabase-js@2.112.4` están fijados.
- Hay clientes separados para navegador, Server Components/Actions y Proxy.
- `proxy.ts` refresca la sesión con `getClaims()` y copia cookies y encabezados anti-cache.
- El DAL llama `getUser()` y `get_my_principal()` cerca de los datos antes de renderizar admin.
- El nombre de cookie `diaca-development-auth` evita colisiones con otros Supabase locales.
- La app no escribe tokens en `localStorage`. `@supabase/ssr` controla cookies; no se fuerza `HttpOnly` porque el cliente browser del SDK necesita leerlas para el flujo SSR. Se usa `SameSite=Lax`, `Secure` en producción y `Path=/`.
- Admin usa render dinámico y respuestas `private, no-store`; no se comparte sesión en CDN/cache público.

## Flujo Auth

- `/login`: correo y contraseña, Zod server-side, error genérico y sin registro público.
- `/auth/callback`: intercambia PKCE `code` y acepta únicamente destinos internos validados.
- Logout: registra `auth.logout`, ejecuta `signOut({ scope: "local" })` y vuelve a `/login`.
- Usuario sin sesión: `/admin` redirige a `/login?next=/admin`.
- Perfil `inactive`: el login técnico puede validarse, pero la app cierra la sesión y niega admin.
- Recuperación de contraseña: diferida a una subfase; deberá usar mensajes anti-enumeración y callback interno.

Supabase Auth local aporta límites configurados para sign-in/refresh. CAPTCHA, SMTP productivo y rate limiting distribuido se revisarán antes del corte a producción; no se añadió infraestructura pagada.

## Admin

`/admin` muestra nombre y rol reales, navegación autorizada, estado de sesión y logout. En F8, Configuración fue reemplazada por `/admin/usuarios`: solo el Owner con `users.manage` puede invitar cuentas y asignar rol/estado. Auth Admin se invoca únicamente server-side; cada alta nace `staff/inactive`, y RLS/guards impiden autoelevación y protegen al último Owner activo.

## Auditoría

`audit_logs` almacena actor, acción, entidad, before/after JSONB, correlación, IP opcional, user-agent limitado y `timestamptz`. Los eventos de Fase 2 son:

- `auth.login.success`
- `auth.logout`
- `profile.updated`
- `user.role_changed`
- `role.permission_changed`

Clientes autenticados no reciben INSERT, UPDATE ni DELETE sobre la tabla. `record_auth_event` solo admite las dos acciones Auth y siempre deriva `actor_id` de `auth.uid()`. Los triggers derivan actor y datos antes/después para perfiles y permisos. No se registran credenciales, tokens o claves.

## Testing y operación

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm supabase:lint
pnpm supabase:test
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

pgTAP cubre 50 casos positivos y negativos: estructura, RLS forzada, grants —incluidos los límites de `service_role`—, `search_path`, signup/profile fail-closed, matrices, inyección en permission code, escalada admin→owner, acceso ajeno, catálogos, auditoría append-only, inactive y anon. Vitest cubre redirecciones internas y open redirects.

En cloud DEV se aprovisionaron cinco identidades sintéticas y se validó `signInWithPassword` + `get_my_principal`: owner/active/17 permisos, admin/active/12, finance/active/9, staff/active/4 e inactive/staff/0. Las contraseñas de verificación fueron efímeras y se descartaron.

CI ejecuta validación web y un job de base aislado en Docker; no hay credenciales de Supabase cloud ni comandos `--linked`.

## Vercel

El único destino usado es `asesoriaeducativadiaca-next`, enlazado desde `apps/web`. El vínculo antiguo de Fase 1 apuntaba a un proyecto ya inexistente o inaccesible, por lo que se recreó con el mismo nombre en el único scope autorizado visible. Development/Preview contienen `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` del cloud DEV; no existe service-role key en Vercel.

Preview validado: `https://asesoriaeducativadiaca-next-juey5n641.vercel.app`. Deployment Protection exige SSO de Vercel. Las rutas se comprobaron mediante el bypass autenticado de la CLI: públicas/login/robots/sitemap responden 200 y `/admin` sin sesión responde 307 a `/login?next=/admin`. `robots.txt` devuelve `Disallow: /` y `X-Robots-Tag: noindex`. El dominio oficial no está conectado.

Supabase Auth usa el Preview actual como Site URL y permite exclusivamente callbacks bajo `https://asesoriaeducativadiaca-next-*.vercel.app/auth/callback` para futuros deployments del mismo proyecto aislado.

## CSP y headers

Se conservan `nosniff`, `X-Frame-Options: DENY`, Referrer Policy y Permissions Policy. Una CSP estricta no se activa a ciegas: antes se deben inventariar recursos de Next/Vercel y el host cloud DEV de Supabase, y probar nonces/estilos en preview. Se mantiene como riesgo de fase posterior.

## Zona horaria

PostgreSQL guarda instantes como `timestamptz`. La UI futura presentará fechas en `America/Tegucigalpa`; no se guardan timestamps locales ambiguos.

## Riesgos y pendientes

- Alto: falta el ejercicio oficial `pg_dump` + restore del sistema heredado.
- Medio: falta SMTP/recuperación de contraseña y política operativa de invitaciones.
- Medio: falta CSP completa probada en preview.
- Medio: rate limiting distribuido del sistema heredado sigue pendiente.
- Bajo: los usuarios sintéticos cloud no conservan una contraseña compartida; para una sesión manual futura se debe rotar una credencial desde Auth DEV o ejecutar el script con una variable efímera.
- Bajo: `@supabase/ssr` continúa marcado beta por Supabase; las versiones están fijadas y requieren revisión antes de actualizar.
- Pendiente heredado: revisión manual de `localStorage` del CRM viejo, migración futura de usuarios reales y posible rotación preventiva.

## Procedimiento de promoción inicial

1. Crear/invitar al usuario exclusivamente en Supabase DEV.
2. Confirmar que el trigger creó un perfil `inactive`.
3. Desde un contexto administrativo DEV, ejecutar una sola vez:

   ```sql
   select public.bootstrap_initial_owner('<auth-user-uuid>'::uuid);
   ```

4. Confirmar owner activo y ejecutar pgTAP. No incorporar correo, UUID, contraseña o clave a migrations.
