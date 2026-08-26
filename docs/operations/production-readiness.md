# Preparación de producción y plan de Fase 8

## Inventario de variables (sin valores)

| Variable | Production | Secreta | Consumidor | Fuente/owner |
|---|---:|:---:|---|---|
| `NEXT_PUBLIC_SITE_URL` | sí | no | Next | dominio oficial aprobado |
| `LEADS_API_URL` | temporal | no | proxy Next | Legacy `bih6` hasta migración |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | no | Next/Supabase | nuevo proyecto Production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sí | pública | browser/SSR | Supabase Production |
| `SUPABASE_SECRET_KEY` | sí | sí | cron Next | Supabase Production secret store |
| `RATE_LIMIT_SECRET` | sí | sí | Route Handlers | generado para Production |
| `CRON_SECRET` | sí | sí | cron-jobs.org/Next | generado para Production |
| `RESEND_API_KEY` | sí | sí | recordatorios email | Resend Production |
| `RESEND_FROM_EMAIL` | sí | no | recordatorios email | dominio verificado |
| `FIREBASE_PROJECT_ID` | sí | no | FCM server | Firebase autorizado |
| `FIREBASE_CLIENT_EMAIL` | sí | sí | FCM server | service account restringida |
| `FIREBASE_PRIVATE_KEY` | sí | sí | FCM server | secret store |
| `NEXT_PUBLIC_FIREBASE_*` | sí | pública | web push browser | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | sí | pública | web push browser | Firebase Cloud Messaging |

Development/Preview usan exclusivamente recursos DEV. Production no reutiliza secretos DEV. Rotación: CRON/rate-limit ante exposición y al menos anual; Resend/Firebase/Supabase según política del proveedor y ante exposición. Cada rotación requiere inventario de consumidores, actualización coordinada, validación e invalidación anterior.

## Orden estricto de Fase 8

1. Aprobar ventana, responsables, RPO/RTO, rollback y comunicación.
2. Crear Supabase Production y configurar Auth sin signup público.
3. Aplicar migrations verificadas; ejecutar lint/pgTAP y auditoría de grants/RLS.
4. Reducir TTL DNS con anticipación solo tras autorización y registrar valores previos.
5. Congelar escrituras Legacy, realizar backup manual y verificar hash/listado.
6. Migrar datos por tablas con IDs/mapeos estables: clientes, servicios, finanzas, auditoría operativa permitida y tareas. Comparar conteos, totales por moneda, checksums y muestras.
7. Provisionar usuarios mediante invitación/reset; nunca migrar contraseñas manualmente. Asignar roles con doble revisión.
8. Configurar variables Vercel Production, Resend, Firebase y cron. Crear job `DIACA task reminders`, POST cada 5 minutos, Bearer header, timeout y alertas. El job Legacy no procesa tablas nuevas.
9. Desplegar Next Production todavía sin dominio; ejecutar smoke autenticado, exports, cron idempotente, proveedores, Lighthouse/Axe y endpoints Legacy.
10. Conectar dominio, validar TLS/DNS y mantener Firebase listo para rollback durante la ventana.
11. Ejecutar smoke post-cutover y monitorear Auth, 5xx, Supabase, leads, cron/FCM/Resend, latencia y logs sin secretos.
12. Solo tras estabilidad aprobada: retirar rutas Legacy, cron viejo y proyectos residuales en una ejecución separada.

## Criterios de rollback

Rollback inmediato ante pérdida/corrupción de datos, Auth/RLS roto, APIs críticas indisponibles, errores sostenidos, DNS/TLS incorrecto o proveedores sin entrega y sin alternativa. Restaurar DNS/origen previo, mantener freeze, preservar evidencia y reconciliar escrituras antes de reintentar.

## Go/no-go

Go requiere backup restaurado, migración reconciliada, RLS/CI verdes, usuarios de prueba por rol, dominio/TLS planificados, proveedores validados, observabilidad y rollback ensayado. Cualquier riesgo crítico/alto o evidencia incompleta implica no-go.
