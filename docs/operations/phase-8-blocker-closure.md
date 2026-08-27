# Fase 8: cierre de bloqueos con infraestructura gratuita

Fecha de cierre técnico: 2026-08-26.

Esta decisión sustituye la propuesta anterior de crear un tercer proyecto o
contratar Supabase Pro. El backend definitivo es el proyecto existente cuyo
Project Ref es `jowbnimjujbllqclpdyq`. El nombre visible
`diaca-development` se conserva para no introducir riesgo; operativamente se
clasifica desde este cierre como Production.

No se realizó cutover, despliegue Production, cambio de DNS, cambio de dominio
ni modificación de Firebase Hosting. Car Zone no fue consultado ni modificado.

## Resultado de la conversión

- 28/28 migrations locales y remotas coinciden.
- DB lint remoto: sin errores.
- pgTAP local sin seed, sobre las mismas migrations: 326/326.
- `seed.sql` no se ejecutó en remoto y no se realizó `db reset` remoto.
- Fixtures DEV eliminados mediante allowlist transaccional:
  - 6 usuarios y 6 perfiles sintéticos;
  - 10 clientes, 3 notas y 4 servicios sintéticos;
  - 227 eventos de auditoría DEV/F7 y 2 buckets de rate limit efímeros.
- Referencia versionada conservada: 4 roles, 23 permisos, 64 relaciones de
  permisos, 6 categorías, 9 servicios y 5 métodos de pago.
- Tablas de negocio finales: 0 clientes, notas, servicios contratados, cargos,
  pagos, asignaciones, recibos, recordatorios, entregas y push tokens.
- Storage: 0 buckets y 0 objetos.

## Auth final

- 3/3 usuarios Legacy, UUID y email preservados.
- Hashes bcrypt importados mediante la API Admin soportada; no se inventaron
  contraseñas.
- 1 perfil Owner activo (`kenneth`) y 2 Admin activos (`cristianponce` y
  `kennethduron`).
- 0 sesiones y 0 refresh tokens migrados.
- Signup público, linking manual y acceso anónimo deshabilitados; email activo
  y confirmación de email habilitada.
- Owner puede invitar/crear usuarios y asignar roles mediante
  `/admin/usuarios`; los perfiles nuevos nacen `staff/inactive` y RLS/guards
  impiden autoelevación y eliminación del último Owner.

El primer login usa la contraseña Legacy porque Supabase acepta bcrypt. Toda
sesión Legacy es inválida por pertenecer a otro proyecto/JWT. Si un usuario no
recuerda su contraseña, se usa reset seguro una vez configurado SMTP
Production; nunca se entrega una contraseña inventada.

## Tareas Legacy finales

- 13/13 preservadas con UUID, título, fecha de creación y vencimiento.
- El backup real contiene `done=t` en las 13: se preservaron como
  `status='completed'`.
- `assigned_to=NULL` en 13/13; no se inventó responsable.
- `completed_at=NULL` y `completed_by=NULL` porque Legacy no contiene esos
  datos. La excepción está limitada por constraint a metadata verificada
  `source=diaca-crm` y `legacy_done=true`.
- `migration_metadata` conserva ID, etiqueta, fecha y booleano originales.
- Etiquetas: Equipo DIACA 8, Equipo legal 3, Equipo académico 2.
- 0 duplicados, 0 huérfanos y 0 errores de reconciliación.
- El RPC temporal de importación fue eliminado inmediatamente después.

Owner/Admin puede reabrir y luego reasignar las tareas desde el sistema. Las
tareas normales siguen requiriendo un assignee activo al crearse.

## Backups gratuitos

Backup previo a conversión:

`C:\Users\user\AppData\Local\DIACA\backups\f8-dev-preconversion-20260826T224241Z`

Backup baseline posterior:

`C:\Users\user\AppData\Local\DIACA\backups\f8-production-baseline-20260826T225949Z`

Ambos contienen roles y dumps schema/data de `public`, `auth`, `storage` y
`supabase_migrations`, con tamaños y SHA-256 verificados. Ambos pasaron restore
drill en PostgreSQL 17.6 aislado. El baseline restaurado confirmó 3 Auth,
3 identities, 0 sesiones, 0 refresh tokens, 3 perfiles, 13 tareas, RLS forzada
en 21/21 tablas y ausencia del RPC temporal.

Política gratuita aprobada:

- dump lógico diario; RPO operativo máximo 24 horas;
- RTO objetivo 4-8 horas por restore y reconciliación manual;
- retención: 14 diarios, 8 semanales y 12 mensuales;
- dump obligatorio inmediatamente antes de migrations o cambios masivos;
- copia cifrada fuera del repositorio y fuera del equipo origen; no subir dumps
  sin cifrar a Git ni artifacts públicos;
- restore drill trimestral y después de cambiar versión mayor de PostgreSQL;
- durante rollback: freeze, no avanzar DNS, preservar evidencia, restaurar
  primero en PostgreSQL aislado y reconciliar antes de reabrir escrituras.

Supabase Free no ofrece backups administrados descargables ni PITR. También
puede pausar un proyecto de baja actividad tras aproximadamente siete días;
se monitorean los avisos y se reanuda desde Dashboard si ocurre. Estas
limitaciones no impiden operar DIACA con el RPO/RTO anterior.

## Vercel y aislamiento

- Vercel Production apunta a `https://jowbnimjujbllqclpdyq.supabase.co` y usa
  publishable key y secret key exclusivas del proyecto.
- La secret key activa se denomina `production_backend_20260826`.
- Preview no conserva URL, publishable key ni secret key Supabase.
- La key DEV/Preview `phase7_closure_20260826` fue revocada en origen.
- Development conserva sólo configuración de desarrollo. Las pruebas futuras
  de DB usan Supabase local, sin seeds ni pruebas destructivas en remoto.
- No se desplegó Production todavía.

## Resend gratuito

El plan Free es suficiente para el volumen inicial: hasta 3,000 emails al mes,
100 al día y un dominio personalizado. El dominio
`mail.asesoriaeducativadiaca.com` ya fue registrado en Resend. Los registros
DNS se publicaron en Cloudflare el 2026-08-26 sin modificar ningún registro
preexistente, con FROM de aplicación
`DIACA <notificaciones@mail.asesoriaeducativadiaca.com>` y FROM Auth
`DIACA Acceso <acceso@mail.asesoriaeducativadiaca.com>`.

Preview conserva la key `Onboarding` únicamente en el scope Preview de la rama
`feat/diaca-bank-hardening`, junto con su FROM `resend.dev`. Production no tiene
ninguna variable Resend todavía y no reutilizará esa key. Se publicaron estos
registros exactos:

| Uso | Tipo | Nombre | Contenido | Prioridad |
| --- | --- | --- | --- | --- |
| DKIM | TXT | `resend._domainkey.mail` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9UmqEUbJ2Ic3IzJVYXM/pHaYuCcl+8pZXeCj1m74r2mt4C/WggRBGZvZ2mDa0MaZSP6Umztu1PImnuovjSrP/PQRWTx+JMgS9umhdGcGDZEC94hTuxPfTouA5k/Af1mEdRizR9ntxA2PR28G2OsC6poGhi2YZ9KEYL9CFN2DwrQIDAQAB` | — |
| Return-Path | MX | `send.mail` | `feedback-smtp.us-east-1.amazonses.com` | `10` |
| SPF | TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | — |
| DMARC inicial | TXT | `_dmarc` | `v=DMARC1; p=none;` | — |

Los nombres anteriores son relativos a `asesoriaeducativadiaca.com`; si el
proveedor DNS exige FQDN, usar `resend._domainkey.mail.asesoriaeducativadiaca.com`,
`send.mail.asesoriaeducativadiaca.com` y
`_dmarc.asesoriaeducativadiaca.com`. TTL queda en automático.

Cloudflare muestra los cuatro registros con TTL automático y `DNS only`; una
consulta DNS pública devuelve los cuatro valores exactos. Resend registró el
evento `DNS verified`: MX y SPF figuran `Verified`, mientras DKIM y el dominio
global permanecen temporalmente `Pending` durante `Verifying domain`. No queda
ninguna acción DNS manual. Cuando el dominio global pase a `Verified`, Ken Code
creará keys Production independientes y restringidas para recordatorios y SMTP
Auth, las instalará sin exponerlas y ejecutará pruebas controladas de
recordatorio y reset/invitación. No se crea ninguna key Production antes de
verificar el dominio.

## Dictamen

**GO técnico para continuar F8 con infraestructura gratuita existente.**

El backend, Auth, datos, migrations, RLS y aislamiento Supabase/Vercel están
reconciliados. El único bloqueo externo antes de probar correo y hacer cutover
es que Resend complete su verificación interna del dominio; DNS ya está listo.

Fuentes oficiales:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects
- https://resend.com/pricing
- https://resend.com/docs/dashboard/domains/introduction
