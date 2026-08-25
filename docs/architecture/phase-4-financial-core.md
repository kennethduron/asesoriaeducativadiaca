# Fase 4: núcleo financiero

## Alcance y principio contable

Fase 4 incorpora cargos explícitos, pagos, asignaciones, recibos, idempotencia,
anulación y auditoría. No incorpora estado de cuenta final, aging, morosidad,
dashboard, reportes, Excel ni PDF de estados.

La invariante principal es:

```text
servicio contratado != cuenta por cobrar
```

`client_services` describe el servicio. Solo una fila creada explícitamente en
`charges` constituye deuda. No existe `clients.balance`: el saldo se deriva de
`charges.amount - payment_allocations` activas vinculadas a pagos confirmados.

## Modelo

```text
clients
  |
  +----------------> charges
  |                    ^
  |                    |
  |            payment_allocations
  |                    |
  v                    |
payments --------------+
  |
  v
receipts

payments
  |
  +----> payment_methods

idempotency_keys
  +----> operaciones financieras
```

- `charges`: cuenta por cobrar explícita y opcionalmente relacionada con un
  servicio del mismo cliente.
- `payment_methods`: catálogo seed-only (`cash`, `transfer`, `deposit`, `card`,
  `other`). No almacena cuentas bancarias.
- `payments`: ingreso recibido en estado `draft`, `confirmed` o `voided`.
- `payment_allocations`: distribución consolidada por pago/cargo. La restricción
  `unique(payment_id, charge_id)` evita líneas duplicadas.
- `receipts`: un snapshot inmutable por pago confirmado, con numeración de
  secuencia.
- `idempotency_keys`: contrato actor/operación/hash/resultado para reintentos.

Todas las claves foráneas financieras usan `ON DELETE RESTRICT`. No se concede
`DELETE` a navegador, `authenticated`, `anon` ni `service_role`.

## Invariantes

- Montos `numeric(14,2)` estrictamente mayores que cero.
- Moneda de tres letras mayúsculas.
- Concepto no vacío; fechas y longitudes acotadas.
- Un servicio relacionado debe pertenecer al cliente del cargo; un trigger lo
  verifica en PostgreSQL.
- Una asignación no puede superar el pago ni el saldo bloqueado del cargo.
- Pago y cargo deben compartir cliente y moneda.
- Un cargo cancelado no recibe asignaciones.
- El navegador no decide estados, actores, timestamps, saldos ni número de
  recibo.
- Un cargo con asignaciones activas no puede cancelarse ni cambiar identidad
  financiera.
- Filas financieras no se borran: la reversión llena `reversed_*` y la
  anulación llena `voided_*`.

## Saldos y estados

`charge_balances` es una vista `security_invoker` que devuelve monto original,
aplicado, restante y estado derivado. Ignora asignaciones revertidas y pagos no
confirmados. `pending`, `partial` y `paid` se sincronizan bajo control interno;
`cancelled` es un estado explícito. `overdue` no se persiste.

`payment_available_balances` calcula el crédito no aplicado de pagos
confirmados. Se permiten pagos cuyo monto sea mayor que la suma de asignaciones;
la diferencia queda visible, pero no reduce ningún cargo.

## Confirmación transaccional

`confirm_payment(payment_id, allocations, operation_key)` es `SECURITY DEFINER`
con `search_path = ''` y acceso únicamente para `authenticated`. Internamente:

1. Obtiene `auth.uid()` y verifica `payments.confirm`.
2. Bloquea el pago con `FOR UPDATE`, exige `draft`, creador coincidente y clave
   coincidente.
3. Normaliza asignaciones ordenadas por UUID y calcula SHA-256 determinístico.
4. Inserta o bloquea la clave idempotente. Mismo actor/hash completado devuelve
   el mismo recibo; payload diferente se rechaza.
5. Valida unicidad, positividad y suma no mayor que el pago.
6. Bloquea cargos en orden UUID para reducir deadlocks.
7. Revalida cliente, moneda, cancelación y saldo real bajo lock.
8. Inserta asignaciones, confirma el pago y sincroniza cargos.
9. Consume `receipt_number_seq`, crea `REC-000001` y guarda el snapshot.
10. Añade auditoría correlacionada y completa la clave idempotente.

PostgreSQL garantiza rollback completo ante cualquier excepción. La secuencia no
es transaccional deliberadamente: puede dejar huecos, pero nunca reutiliza un
número. `READ COMMITTED` con row locks ordenados es suficiente; no se cambia el
aislamiento global.

## Anulación y cancelación

`void_payment()` exige `payments.void`, motivo y pago confirmado. Bloquea pago,
asignaciones y cargos; marca asignaciones revertidas, pago y recibo anulados,
recalcula cargos y genera auditoría con un correlation ID común. Un segundo void
concurrente observa el nuevo estado y se rechaza.

`cancel_charge()` exige `charges.cancel`, motivo y ausencia de asignaciones
activas. Conserva la fila, actor, fecha y causa. Si hubo un pago, primero debe
anularse el pago correspondiente.

## Recibos

El snapshot conserva nombre empresarial, cliente y código, fecha, método, monto,
moneda, referencia, conceptos, asignaciones, totales y número. No contiene JWT,
passwords, claves ni PII innecesaria. La UI siempre presenta el snapshot, no una
reconstrucción mutable del presente. Un recibo anulado conserva número y muestra
su condición de forma explícita.

## RLS, grants y roles

Las seis tablas tienen RLS habilitada y forzada.

| Recurso               | Lectura         | Escritura                                                 |
| --------------------- | --------------- | --------------------------------------------------------- |
| `charges`             | `charges.read`  | insert/update con `charges.write`; lifecycle solo RPC     |
| `payment_methods`     | `payments.read` | seed-only                                                 |
| `payments`            | `payments.read` | insert draft con `payments.create`; confirm/void solo RPC |
| `payment_allocations` | `payments.read` | solo función transaccional                                |
| `receipts`            | `payments.read` | solo función transaccional                                |
| `idempotency_keys`    | ninguna directa | solo función transaccional                                |

`owner` conserva todos los permisos y es el único rol inicial con
`payments.void` y `charges.cancel`. `admin` y `finance` leen/escriben cargos y
crean/confirman pagos según la matriz existente; no se amplió su capacidad de
anulación. `staff`, perfiles inactivos y `anon` no acceden a finanzas. Las RPC
revocan `PUBLIC`, `anon` y `service_role`; `authenticated` solo entra a funciones
que vuelven a comprobar el permiso.

## Auditoría

Se registran `charge.created`, `charge.updated`, `charge.cancelled`,
`payment.draft_created`, `payment.confirmed`, `payment.voided`,
`payment.allocation.created`, `payment.allocation.reversed`, `receipt.issued` y
`receipt.voided`. Confirmación y anulación comparten correlation ID entre todas
sus entidades. `audit_logs` permanece append-only. Referencias bancarias no se
copian a logs.

## UI y responsive

El menú y Perfil 360 muestran Cargos/Pagos solo con permiso. Los listados usan
query server-side, filtros y paginación, tabla en desktop y cards en mobile. El
flujo de pago permite distribución manual o visible por antigüedad, trabaja en
centavos enteros en UI y exige un diálogo antes de confirmar. El resumen sticky
respeta `safe-area-inset-bottom`.

El recibo tiene layout de una columna en móvil, presentación profesional y CSS
de impresión. Los estados siempre combinan texto y color. Inputs y acciones
críticas tienen al menos 44 px, foco visible, labels, live regions y errores en
lenguaje operativo. Los diálogos nativos aportan foco modal, Escape y límites de
viewport.

Las pruebas Playwright recorren 375x812, 390x844, 430x932, 768x1024,
820x1180, 1024x768, 1366x900 y 1440x900 para cargos, pagos, nuevo pago y recibo;
comprueban overflow, targets táctiles y diálogo móvil. Las capturas son artefactos
temporales ignorados por Git.

## Pruebas

- pgTAP cubre estructura, constraints, RLS, grants, roles, manipulación directa,
  RPC, saldos, 100 números de recibo, idempotencia, reversión y auditoría.
- `financial-concurrency.mjs` dispara peticiones PostgREST simultáneas reales
  contra Supabase local para doble pago, doble submit, key/payload diferente,
  recibos concurrentes y void concurrente.
- Vitest cubre dinero sin coma flotante, canonicalización, asignación por
  antigüedad, Zod, filtros y contrato de presentación del recibo.
- Playwright crea solo fixtures `example.invalid` locales y prueba Finance,
  Owner y Staff. Nunca debe apuntarse a producción.

## Drafts abandonados

Un draft puede quedar visible para usuarios con lectura financiera si la
confirmación no termina. No existe cron ni borrado automático en Fase 4. No se
confunde abandono con `void`, que solo aplica a pagos confirmados. Una política
de descarte controlado puede diseñarse en una fase futura.

## Cache y rendimiento

El layout administrativo es dinámico por sesión. Los listados usan RPC agregada
y las vistas calculan saldos en una consulta, sin N+1 ni cache público/CDN. Los
índices cubren cliente/fecha/estado, vencimiento, método, asignaciones, recibos e
idempotencia.

## Riesgos residuales

- Medio: los drafts abandonados requieren una política operativa futura.
- Medio: el crédito no aplicado es visible pero todavía no es una cuenta
  contable transferible o reembolsable.
- Bajo: las secuencias pueden mostrar huecos después de rollback; es una
  propiedad de seguridad, no pérdida de recibos.
- Bajo: el catálogo de métodos es seed-only; cambios requieren migration.
- Bajo: filtros `ILIKE` son adecuados al volumen actual; deberá evaluarse
  búsqueda especializada si el volumen crece sustancialmente.

Fase 5 podrá consumir estas vistas para estado de cuenta, totales, saldo vencido,
aging, morosidad y statement PDF sin introducir un saldo manual, una vez que la
operación de Fase 4 sea aceptada.
