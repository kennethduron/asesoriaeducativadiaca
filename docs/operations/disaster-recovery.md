# Recuperación ante desastres

## Alcance y responsables

El owner técnico ejecuta backup/restore; el owner de negocio autoriza rollback o pérdida aceptable. En incidentes se congelan escrituras, se preservan logs y se registra correlation ID. El objetivo inicial para el futuro cutover es RPO ≤ 24 h con backups administrados más backup manual previo, y RTO objetivo de 4 h; deberán validarse con el plan real de Supabase antes de producción.

## Backup verificable

1. Confirmar por Project Ref el origen y registrar versión de PostgreSQL/`pg_dump`.
2. Ejecutar `pg_dump --format=custom --no-owner --no-privileges` mediante conexión SSL segura. La contraseña solo entra por un secret store/variable efímera.
3. Guardar el `.dump` fuera del repositorio en almacenamiento temporal cifrado; calcular tamaño, UTC timestamp y SHA-256.
4. Validar `pg_restore --list`, extensiones, schemas, funciones, policies, secuencias y contenido esperado.
5. Borrar el artefacto temporal después del drill según retención.

Nunca imprimir connection strings o subir dumps a Git/CI artifacts. Para producción, usar cifrado at rest, acceso auditado, retención acordada y una copia pre-cutover inmutable.

## Restore aislado

1. Crear un PostgreSQL temporal compatible; nunca restaurar encima de DEV/Production.
2. Crear extensiones requeridas y ejecutar `pg_restore --clean --if-exists --no-owner --no-privileges` sobre la base vacía.
3. Comparar conteos y constraints críticos: perfiles, clientes, servicios, cargos, pagos, asignaciones, recibos, auditoría, tareas, recordatorios y entregas.
4. Verificar funciones, RLS forzada, grants, secuencias y consultas financieras/bancarias.
5. Ejecutar pgTAP y consultas críticas contra el restore si el entorno lo permite.
6. Destruir el entorno temporal de forma controlada.

Un backup no se considera válido hasta completar este restore drill. Registrar versión, tamaño, hash, duración y cualquier incompatibilidad sin registrar secretos ni datos personales.

## Rollback

Ante una migración fallida: detener nuevas escrituras, mantener Firebase/Legacy como front operativo, no cambiar DNS, recopilar evidencia, restaurar en un proyecto aislado y decidir entre migración forward o rollback. Nunca improvisar un restore sobre el proyecto afectado sin aprobación y backup adicional.

## Frecuencia futura

En Fase 8 se confirmarán backups administrados de Supabase, retención y PITR disponible. Ejecutar backup manual antes de cada cutover/migración de alto riesgo y un restore drill trimestral durante el primer año.
