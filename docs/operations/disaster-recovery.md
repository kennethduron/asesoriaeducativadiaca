# Recuperación ante desastres

## Alcance y responsables

El owner técnico ejecuta backup/restore; el owner de negocio autoriza rollback o pérdida aceptable. En incidentes se congelan escrituras, se preservan logs y se registra correlation ID. Production usa Supabase Free con backup lógico propio: RPO operativo máximo de 24 h y RTO objetivo de 4-8 h por restauración y reconciliación manual.

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

Supabase Free no incluye backups administrados descargables ni PITR. Ken Code
genera un dump lógico diario y conserva 14 diarios, 8 semanales y 12 mensuales,
además de uno inmediatamente antes de cada cutover/migración de alto riesgo.
Cada copia fuera del repositorio debe estar cifrada y al menos una debe quedar
fuera del equipo origen. Ejecutar restore drill trimestral durante el primer
año y después de cada cambio de versión mayor. Si el negocio requiere un RPO
menor de 24 horas, esta política gratuita deja de ser suficiente y se deberá
reabrir explícitamente la decisión de infraestructura; no se activa ningún
servicio pagado de forma implícita.
