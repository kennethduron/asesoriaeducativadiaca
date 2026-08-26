# Matriz final RBAC/RLS F1–F7

| Recurso | Owner | Admin | Finance | Staff | Inactive | Anon |
|---|---|---|---|---|---|---|
| Clientes / servicios | leer/escribir | leer/escribir | leer | leer/escribir | denegado | denegado |
| Tareas | todas/asignar | todas/asignar | propias/asignadas | propias/asignadas | denegado | denegado |
| Cargos | leer/escribir/cancelar | leer/escribir | leer/escribir | denegado | denegado | denegado |
| Pagos / recibos | todo/anular | leer/crear/confirmar | leer/crear/confirmar | denegado | denegado | denegado |
| Estados de cuenta / dashboard financiero | sí | sí | sí | denegado | denegado | denegado |
| Reportes / exports | sí | sí | sí | denegado | denegado | denegado |
| Reporte bancario genérico | sí | sí | sí | denegado | denegado | denegado |
| Tokens Push | solo propios | solo propios | solo propios | solo propios | denegado | denegado |
| Auditoría | leer | leer | denegado | denegado | denegado | denegado |
| Usuarios/settings | administrar | denegado | denegado | denegado | denegado | denegado |

La UI oculta opciones, pero no es el control de seguridad. Server Components/Actions validan permisos; RPC valida `auth.uid()`/rol; RLS fuerza la visibilidad; grants impiden acceso anónimo. Owner tiene 23 permisos, Admin 19, Finance 14 y Staff 8.

Las tablas financieras no conceden DELETE a `authenticated`; cancelación/anulación preservan ledger y auditoría. `audit_logs` es append-only para la aplicación. `task_push_tokens` es la única tabla F7 con DELETE autenticado y su policy limita la operación a `user_id = auth.uid()`.

Las pruebas pgTAP cubren usuario asignado, creador, admin/owner, usuario ajeno, inactive, anon, IDOR, token ownership, reporte bancario y ejecución exclusiva del cron con service role.
