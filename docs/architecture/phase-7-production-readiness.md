# Fase 7: tareas, reporte bancario y hardening

## Decisiones de alcance

Fase 7 se desarrolla sobre `feat/diaca-bank-hardening` y solo se aplica a `diaca-development` (`jowbnimjujbllqclpdyq`). No crea Supabase Production, no conecta el dominio oficial, no despliega Firebase, no elimina proyectos residuales y no hace cutover.

No se encontró especificación de una institución bancaria. Por ello, “Reporte Bancario / Consolidado de Pagos” es un reporte administrativo genérico derivado de pagos confirmados. No es conciliación automática ni formato homologado. Expone fecha, cliente, método, referencia, moneda, monto, monto aplicado, crédito no aplicado y estado, con filtros estáticos y monedas separadas.

## Tareas

`tasks` conserva título, descripción, cliente/servicio opcional, responsable, creador, prioridad, estado y `due_at timestamptz`. La UI interpreta fecha/hora en `America/Tegucigalpa`. Los recordatorios pueden ser relativos o un instante absoluto anterior al vencimiento.

Owner/Admin ven y administran todas las tareas. Finance/Staff ven tareas creadas por ellos o asignadas a ellos; solo Owner/Admin asignan a terceros. RLS, RPC y guardas de servidor aplican la misma matriz. Los cambios producen `task.created`, `task.updated`, `task.assigned`, `task.completed`, `task.reopened` o `task.cancelled`.

## Recordatorios

El flujo nuevo pertenece exclusivamente al proyecto Next; los endpoints Legacy continúan aislados hasta Fase 8 y no consultan estas tablas. El cron llama `POST /api/internal/task-reminders/run` con Bearer secret server-only. PostgreSQL reclama hasta 50 recordatorios con `FOR UPDATE SKIP LOCKED`, correlation ID, máximo cinco intentos y backoff. La restricción `(reminder_id, channel)` impide duplicados.

Push y email son entregas independientes. Un canal enviado no se repite si el otro falla. Antes de cada envío se revalida que la tarea siga abierta; completar o cancelar invalida entregas pendientes. Tokens FCM pertenecen al usuario, se almacenan server-side con fingerprint, tienen límite de dispositivos y los tokens inválidos se desactivan. Los destinatarios email se resuelven desde Auth, nunca desde el request.

FCM usa HTTP v1 con credenciales Firebase Admin solo en servidor. Resend usa REST con `RESEND_API_KEY` solo en servidor. El cliente recibe únicamente configuración pública Firebase y la VAPID public key.

## Seguridad

- No existe signup público; Supabase Auth provisiona usuarios de forma controlada.
- Password reset usa respuesta no enumerativa, enlace de callback, contraseña robusta, revocación global y auditoría.
- Leads, password reset y exports usan rate limiting PostgreSQL distribuido; el login conserva los controles de Supabase Auth.
- Leads exige `Origin` exacto. Mutaciones administrativas usan Server Actions, sesión SSR y RLS.
- Admin/auth llevan `noindex`; admin y exports son `private, no-store`.
- CSP niega `object-src`, `base-uri` y framing; permite solo orígenes necesarios para Supabase/Firebase. `unsafe-inline` queda como excepción temporal de Next/Tailwind y debe migrarse a nonce/hash en Fase 8. `unsafe-eval` solo se admite en desarrollo local.
- Las 45 funciones `SECURITY DEFINER` auditadas tienen `search_path=''` y `PUBLIC EXECUTE` revocado.
- No hay políticas DELETE financieras para roles de aplicación.

## Límites

XLSX permanece limitado a 5,000 filas y PDF síncrono a 250. Reportes mayores requieren una futura cola asíncrona. Los proveedores reales Push/Email solo se validan con destinatarios y dispositivos sintéticos controlados. El cron Production no se crea antes del cutover.
