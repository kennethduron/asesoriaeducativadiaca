# Fase 3: clientes, servicios y Perfil 360°

## Alcance

La Fase 3 añade la operación básica de clientes y servicios sobre la identidad, RBAC, RLS y auditoría de Fase 2. No incluye cargos, pagos, recibos, saldos, morosidad ni reportes financieros. Tampoco almacena identidad nacional, RTN, fecha de nacimiento u otros datos sensibles que aún no son necesarios.

## Esquema y relaciones

```text
clients
 ├── client_notes
 └── client_services
          │
          ▼
    service_catalog
          │
          ▼
  service_categories
```

- `clients` conserva datos de contacto, estado y una referencia futura `source_lead_id` sin FK hacia el sistema heredado.
- `client_notes` contiene texto plano interno de 1 a 5,000 caracteres. Se permite corregirlo, pero no eliminarlo por la interfaz ni por grants de usuario.
- `service_categories` organiza la taxonomía pública existente de DIACA.
- `service_catalog` define el servicio, precio estándar opcional y moneda ISO de tres letras.
- `client_services` registra la contratación operativa. No representa una cuenta por cobrar.
- Las FK operativas usan `ON DELETE RESTRICT`; el ciclo normal se maneja con estados.

`created_by` y `updated_by` referencian `profiles.id`. Los triggers sustituyen cualquier actor enviado por un usuario autenticado con `auth.uid()`. `updated_at` usa la función reutilizable de Fase 2.

## Código de cliente y concurrencia

`client_code_seq` y `generate_client_code()` generan `CLI-000001`, `CLI-000002`, etc. Una secuencia PostgreSQL evita la carrera de `COUNT(*) + 1`; los saltos son aceptables porque el código es identificador legible, no comprobante fiscal. Los roles API no pueden avanzar la secuencia directamente: la asignación pasa exclusivamente por la función `SECURITY DEFINER`. pgTAP genera cien valores en una transacción y comprueba unicidad, formato y privilegios.

## Categorías y seed

La migración del catálogo mantiene los seis nombres confirmados en el sitio actual: asesoría académica, servicios legales civiles, redacción profesional, trámites y registros, digital y tecnología, emprendimiento y finanzas. `supabase/seed.sql` agrega diez clientes, notas y servicios contratados claramente sintéticos. El usuario seed usa un dominio `.invalid`, no tiene contraseña utilizable y solo existe en DEV.

## RLS y permisos

| Recurso | SELECT | INSERT / UPDATE | DELETE |
| --- | --- | --- | --- |
| `clients` | `clients.read` | `clients.write` | sin grant |
| `client_notes` | `clients.read` | `clients.write` | sin grant |
| `service_categories` | `services.read` | `services.write` | sin grant |
| `service_catalog` | `services.read` | `services.write` | sin grant |
| `client_services` | `services.read` | `services.write` | sin grant |

Con la matriz de Fase 2, owner tiene todo; admin y staff operan clientes/servicios; finance solo lee; perfiles inactive y `anon` no acceden. Todas las tablas tienen RLS habilitada y forzada. `service_role` no recibe grants directos de Fase 3.

Las RPC `get_client_activity` y `get_client_notes` son `SECURITY DEFINER`, fijan `search_path` vacío, verifican `clients.read` y solo devuelven campos de presentación. Así staff puede ver autores y actividad de un cliente sin recibir acceso general a perfiles ni al JSON de auditoría. `find_client_duplicates` y `search_clients` son `SECURITY INVOKER`.

## Consultas

`search_clients` recibe parámetros tipados para búsqueda, estado, columna, dirección, página y tamaño. La columna y dirección usan listas blancas; el texto se usa como parámetro, no como SQL dinámico. La consulta pagina en servidor y calcula `active_services_count` con una agregación, sin N+1. Se admiten 20, 50 o 100 filas, con 20 por defecto.

El Perfil 360° limita notas y actividad a 30 y servicios recientes a 50. Si el volumen lo exige, una fase posterior puede añadir paginación independiente por pestaña.

## Páginas

- `/admin/clientes`: búsqueda, filtro de estado, orden seguro, paginación, tabla desktop y cards mobile.
- `/admin/clientes/nuevo`: alta con Zod, comprobación de contactos coincidentes y confirmación explícita.
- `/admin/clientes/[id]`: Perfil 360° con Resumen, Servicios, Notas y Actividad.
- `/admin/clientes/[id]/editar`: edición con comparación optimista de `updated_at`.
- `/admin/servicios`: catálogo, precios estándar, estados y gestión simple de categorías.
- `/admin/servicios/[id]/editar`: edición del catálogo.

Las mutaciones son Server Actions que revalidan sesión y permiso, validan con Zod, escriben mediante el cliente SSR sujeto a RLS y revalidan rutas. Los triggers de base registran auditoría, por lo que no dependen de que la aplicación recuerde hacerlo.

## Auditoría

Se registran: `client.created`, `client.updated`, `client.status_changed`, `client.note.created`, `client.note.updated`, `service_category.created`, `service_category.updated`, `service_category.status_changed`, `service.created`, `service.updated`, `service.status_changed`, `client_service.created`, `client_service.updated` y `client_service.status_changed`.

El Perfil 360° traduce los nombres de evento; nunca presenta el JSON `before_data`/`after_data`. Los logs permanecen append-only para usuarios autenticados.

## Testing y CI

pgTAP cubre estructura, RLS por rol, inactive/anon, ausencia de DELETE, derivación de actor, auditoría, FKs, estados, fechas, precios, moneda, modalidad, duplicidad de código, inyección en búsqueda y cien códigos únicos. Vitest cubre validación de filtros, fechas y normalización no destructiva. CI ejecuta instalación congelada, lint, formato, TypeScript, pruebas, build, reset reproducible, lint SQL y pgTAP.

## Riesgos y decisiones

- El orden de escritura es último-cambio-gana salvo la edición principal del cliente, que compara `updated_at`. Es adecuado para esta fase; notas y servicios no requieren bloqueo complejo.
- La detección de duplicados es una advertencia por coincidencia exacta normalizada de correo/teléfono/WhatsApp. No fusiona ni bloquea por nombre.
- Los precios son informativos. La futura Fase 4 deberá introducir un libro financiero separado e idempotente sin reinterpretar `client_services` como saldo.
- `source_lead_id` queda intencionalmente sin FK hasta diseñar una migración de leads aislada y verificable.
- En Supabase administrado, `db diff --linked` reporta diferencias de serialización de funciones de Fase 2 y privilegios por defecto propios de la plataforma. La lista de migraciones sí coincide y no aparecen tablas, columnas, constraints, policies ni funciones de Fase 3 fuera de versión; no se debe aplicar ciegamente ese diff de privilegios.
