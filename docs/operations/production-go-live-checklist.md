# Checklist de salida a producción

Este checklist se ejecuta en Fase 8. Fase 7 no autoriza migración, DNS, dominio, cron Production ni retiro de Firebase/Legacy. Cualquier evidencia ausente o riesgo crítico/alto implica **NO-GO**.

## Gobierno y ventana

- [ ] Owner técnico y owner de negocio identificados.
- [ ] Ventana, canal de comunicación, freeze y responsables aprobados.
- [ ] RPO/RTO y umbrales de rollback aprobados.
- [ ] TTL y registros DNS actuales inventariados sin cambios prematuros.

## Seguridad y secretos

- [x] Backend Production reutiliza únicamente `jowbnimjujbllqclpdyq`, confirmado por Project Ref.
- [x] Signup público deshabilitado; 3 usuarios Legacy migrados sin sesiones/tokens.
- [x] RLS, grants, funciones `SECURITY DEFINER` y matriz RBAC revisados.
- [x] Secretos Supabase Production nuevos, server-side y separados de Preview/DEV.
- [ ] Browser usa solo claves publicables; CSP, noindex de Admin y headers verificados.
- [ ] Rate limits, logs sin secretos y plan de rotación verificados.

## Backup, restore y migraciones

- [x] Backups preconversión y baseline fuera del repositorio, con tamaño, timestamp y SHA-256.
- [x] Restore real completado en PostgreSQL 17.6 aislado compatible.
- [x] Migrations aplicadas desde cero; DB lint y pgTAP 326/326 verdes.
- [ ] Freeze de escrituras Legacy activado solo dentro de la ventana.
- [x] Conteos, usuarios, clientes, servicios y 13 tareas reconciliados.
- [x] Cargos, pagos, asignaciones y recibos reconciliados en cero real.

## Aplicación y proveedores

- [ ] CI, build y regression F1–F7 verdes sobre el SHA de cutover.
- [ ] Auth Owner/Admin/Finance/Staff e inactive/anon validados.
- [ ] Clientes, servicios, finanzas, estados, dashboard, reportes y exports validados.
- [ ] Tareas, cron idempotente, reintentos y auditoría validados.
- [ ] Resend: dominio/from, DNS, entrega y destinatario controlado validados.
- [ ] FCM: proyecto, service account restringida, token controlado y entrega validados.
- [ ] Leads y APIs Legacy requeridas responden según contrato.

## Dominio y cutover

- [ ] Vercel Production validado sin dominio mediante smoke autenticado.
- [ ] Redirecciones `/index.html`, `/servicios.html`, `/legal.html`, `/contacto.html` y `/crm` aprobadas.
- [ ] Cron Production creado con POST, Bearer secret, frecuencia de 5 minutos, timeout y alertas.
- [ ] Dominio conectado a Vercel y TLS/DNS verificados.
- [ ] Sitio público indexable; Admin permanece `noindex`.
- [ ] Firebase y Legacy permanecen disponibles para rollback durante la ventana.

## QA final

- [ ] Responsive validado en 375, 390, 430, 768, 820, 1024, 1366 y 1440 px.
- [ ] Axe sin impactos serious/critical y flujo de teclado validado.
- [ ] Lighthouse y presupuestos de rendimiento aprobados.
- [ ] PDF/XLSX inspeccionados, sin datos indebidos ni formula injection.
- [ ] No hay 500, errores inesperados de consola, RLS/IDOR ni fallos de configuración.

## Monitoreo posterior

- [ ] **5 min:** DNS/TLS, Auth, 5xx, Supabase y smoke esencial.
- [ ] **30 min:** leads, tareas/cron, FCM, Resend y latencia.
- [ ] **2 h:** pagos, reportes, auditoría, errores y consumo de recursos.
- [ ] **24 h:** reconciliación financiera por moneda, entregas y soporte.
- [ ] **72 h:** estabilidad, incidentes, métricas y autorización de retiro gradual.

## Rollback

- [ ] DNS/origen anterior y valores TTL documentados.
- [ ] Procedimiento para detener escrituras nuevas y preservar evidencia ensayado.
- [ ] Firebase/Legacy listos para recuperar servicio.
- [ ] Estrategia de reconciliación de escrituras durante rollback aprobada.
- [ ] Ningún proyecto, deployment o dato se elimina durante la misma ventana.

## Decisión

- [ ] **GO** firmado por owner técnico y owner de negocio.
- [ ] Si una casilla obligatoria no puede demostrarse: **NO-GO** y rollback/no cutover.
