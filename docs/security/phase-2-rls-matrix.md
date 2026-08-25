# Matriz RLS y RBAC de Fase 2

## Matriz de permisos

| Permiso | owner | admin | finance | staff |
|---|:---:|:---:|:---:|:---:|
| clients.read | ✓ | ✓ | ✓ | ✓ |
| clients.write | ✓ | ✓ | — | ✓ |
| services.read | ✓ | ✓ | ✓ | ✓ |
| services.write | ✓ | ✓ | — | ✓ |
| charges.read | ✓ | ✓ | ✓ | — |
| charges.write | ✓ | ✓ | ✓ | — |
| charges.cancel | ✓ | — | — | — |
| payments.read | ✓ | ✓ | ✓ | — |
| payments.create | ✓ | ✓ | ✓ | — |
| payments.confirm | ✓ | ✓ | ✓ | — |
| payments.void | ✓ | — | — | — |
| reports.read | ✓ | ✓ | ✓ | — |
| reports.export | ✓ | ✓ | ✓ | — |
| bank_reports.generate | ✓ | — | — | — |
| settings.manage | ✓ | — | — | — |
| users.manage | ✓ | — | — | — |
| audit.read | ✓ | ✓ | — | — |

Totales: owner 17, admin 12, finance 9 y staff 4. El catálogo prepara contratos futuros sin crear tablas o rutas financieras.

## Políticas por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| roles | `users.manage` | `users.manage` | `users.manage` | `users.manage`; trigger impide borrar roles del sistema |
| permissions | `users.manage` | `users.manage` | `users.manage` | `users.manage` |
| role_permissions | `users.manage` | `users.manage` | Sin grant/policy | `users.manage` |
| profiles | Perfil propio o `users.manage` | Sin grant/policy; solo trigger Auth | Propio o `users.manage`, con guard de columnas/escalada/último owner | Sin grant/policy |
| audit_logs | `audit.read` | Sin grant/policy; solo RPC/triggers | Sin grant/policy | Sin grant/policy |

Todas las tablas tienen RLS habilitada y forzada. `anon` no tiene grants. `authenticated` recibe únicamente los grants necesarios para que las policies evalúen la operación. `service_role` recibe solo el acceso de provisioning documentado además del bypass propio de Supabase.

## Profiles

- El usuario puede leer su fila incluso si está inactivo, pero `get_my_principal` entrega permisos vacíos para inactive.
- Sin `users.manage`, una actualización propia no puede cambiar rol, estado, timestamps de creación o creador.
- Solo un owner activo puede asignar `owner`.
- El último owner activo no puede degradarse ni inactivarse.
- Altas Auth crean `staff/inactive`, nunca una cuenta administrativa activa por metadata.

## `has_permission`

Firma: `public.has_permission(permission_code text) returns boolean`.

- `SECURITY DEFINER`, `STABLE` y `search_path = ''`.
- Todos los objetos están calificados por schema.
- Usa exclusivamente `auth.uid()` y exige profile active + role active.
- `anon` no tiene EXECUTE; `authenticated` sí.
- Devuelve solo boolean y trata el código como dato parametrizado.
- pgTAP comprueba grants, `search_path`, llamada directa, código con payload de inyección, inactive y matrices.

## Funciones adicionales

| Función | Acceso | Propósito |
|---|---|---|
| `get_my_principal()` | authenticated | DTO mínimo: UUID, nombre, estado, rol y permisos efectivos |
| `record_auth_event(...)` | authenticated | Solo login/logout; actor derivado de `auth.uid()` |
| `bootstrap_initial_owner(uuid)` | service_role | Promoción inicial de un solo uso |
| triggers/guards | Sin EXECUTE cliente | Provisioning, timestamps, protección y auditoría |

## Casos negativos cubiertos

- anon SELECT e INSERT directo.
- admin autoasignándose owner.
- finance solicitando `users.manage`.
- staff leyendo auditoría, roles, permisos o perfil ajeno.
- staff creando roles o modificando role_permissions.
- cliente INSERT/UPDATE/DELETE en auditoría.
- usuario inactive obteniendo permisos.
- `has_permission` con código malicioso.
- `SECURITY DEFINER` sin `search_path` seguro o con EXECUTE anónimo.

La UI nunca reemplaza estas reglas. Toda acción server-side futura deberá llamar `requirePermission()` y además depender de RLS.
