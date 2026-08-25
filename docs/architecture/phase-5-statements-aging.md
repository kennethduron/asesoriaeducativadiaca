# Fase 5: estados de cuenta, saldos, aging y morosidad

## Alcance y fuente de verdad

Fase 5 presenta la cartera financiera creada en Fase 4. No agrega un saldo
editable, una cuenta contable paralela ni una tabla de morosidad. Todos los
resultados se derivan de cargos, pagos confirmados, asignaciones, reversiones y
cancelaciones existentes.

```text
charges + payment_allocations + payments
                    |
                    v
     vistas financieras security_invoker
                    |
                    v
       RPC de cartera y estado de cuenta
                    |
          +---------+---------+
          v                   v
      UI responsive       PDF Letter
```

El crédito no aplicado permanece separado. Se informa, pero no reduce cargos ni
el saldo de cuenta hasta que exista una asignación activa.

## Fórmulas

Para cada cargo no cancelado:

```text
aplicado = suma(asignaciones de pagos confirmados no revertidas)
saldo del cargo = monto original - aplicado
```

Para cada cliente y moneda:

```text
saldo pendiente = suma(saldos de cargos abiertos)
saldo vencido = suma(saldos con due_date < fecha local actual)
saldo al corriente = saldo pendiente - saldo vencido
moroso = saldo vencido > 0
```

El estado de cuenta reconcilia el periodo de forma explícita:

```text
saldo final = saldo inicial
            + cargos
            + reversiones de pagos
            - pagos aplicados
            - cancelaciones de cargos
```

`from` y `to` son inclusivos. El saldo inicial incluye movimientos anteriores a
`from`. Un cargo sin vencimiento y uno cuyo vencimiento es hoy están al
corriente. Las bandas vencidas son 1-30, 31-60, 61-90 y 90+ días. Los cortes se
calculan en PostgreSQL con la fecha operativa del entorno; las fechas por defecto
de la UI usan `America/Tegucigalpa`.

## Vistas y RPC

- `open_charge_details`: cargo abierto, monto original/aplicado/restante, días
  vencidos, banda y estado derivado.
- `client_account_summary`: cartera por cliente y moneda, incluyendo crédito no
  aplicado, conteos y primera fecha de vencimiento abierta.
- `client_aging_summary`: distribución del saldo abierto entre las cinco bandas.
- `client_financial_activity`: cargos, pagos aplicados, reversiones y
  cancelaciones como movimientos explícitos con saldo acumulado.
- `search_client_accounts()`: búsqueda, filtros, orden permitido y paginación
  server-side de 20, 50 o 100 filas.
- `get_client_statement()`: snapshot JSON del cliente, periodo, resumen, aging,
  cargos abiertos y movimientos.
- `record_client_statement_generated()`: registra la exportación PDF sin guardar
  el documento ni PII adicional.

Las vistas usan `security_invoker`. Las RPC son `SECURITY DEFINER`, fijan
`search_path = ''`, validan parámetros con listas permitidas y vuelven a comprobar
permisos. No construyen SQL dinámico.

## Consistencia del snapshot

`get_client_statement()` construye todo el documento en una sola sentencia SQL
dentro de una llamada PostgreSQL. Así, cliente, totales, movimientos, cargos
abiertos y aging comparten el mismo snapshot MVCC de esa sentencia. La prueba de
concurrencia ejecuta 30 lecturas mientras confirma un pago y acepta únicamente el
estado completo anterior o posterior; nunca una combinación parcial. No se
cambia el aislamiento global ni se mantienen locks durante la generación PDF.

## Permisos e IDOR

| Rol/perfil       | Cartera | Estado | PDF/impresión |
| ---------------- | ------- | ------ | ------------- |
| `owner` activo   | Sí      | Sí     | Sí            |
| `admin` activo   | Sí      | Sí     | Sí            |
| `finance` activo | Sí      | Sí     | Sí            |
| `staff`          | No      | No     | No            |
| perfil inactivo  | No      | No     | No            |
| `anon`           | No      | No     | No            |

La lectura requiere simultáneamente `charges.read` y `payments.read`. La
exportación añade `reports.export`. Un UUID conocido no evita estas comprobaciones:
las pruebas cubren acceso directo a RPC, Perfil 360 y endpoint PDF. `anon`,
`service_role` y `PUBLIC` no reciben ejecución directa de las RPC.

## UI, impresión y PDF

`/admin/estados-de-cuenta` ofrece búsqueda, filtro de saldo/moneda, orden y
paginación. El Perfil 360 incorpora la pestaña real `estado-cuenta` solo para
roles autorizados. El estado permite cambiar cliente, moneda y periodo, presenta
resumen, aging, cargos abiertos y movimientos, y enlaza recibos existentes.

La tabla desktop se transforma en tarjetas semánticas en móvil. Inputs y botones
tienen objetivos táctiles de al menos 44 px, foco visible, labels y estados
vacíos. La impresión usa una ruta limpia sin navegación administrativa.

El PDF se genera server-side con `@react-pdf/renderer`, runtime Node, tamaño
Letter y nombre de archivo saneado. Antes de devolverlo se verifican sesión,
perfil activo, permisos, UUID, moneda y fechas. La respuesta usa `no-store` y no
incluye credenciales. Solo después de renderizar correctamente se registra
`client_statement.generated` con cliente, moneda, periodo y correlation ID. La
inspección visual del documento de prueba confirma una página, texto legible,
tabla sin cortes, pie correcto y ausencia de contenido huérfano.

## Cache y privacidad

Las rutas administrativas son dinámicas por sesión y las consultas financieras
no usan cache público ni CDN. El endpoint PDF devuelve `Cache-Control: private,
no-store`. No se persisten PDFs. Las descargas y capturas de Playwright son
artefactos temporales ignorados por Git.

## Rendimiento

Se ejecutó `EXPLAIN (ANALYZE, BUFFERS)` con 500 clientes y 2,500 cargos
sintéticos dentro de una transacción revertida. Resultados locales:

| Consulta                      | Tiempo de ejecución |
| ----------------------------- | ------------------: |
| Cartera, top 100              |             9.19 ms |
| Aging, top 100                |             9.18 ms |
| Cargos abiertos de un cliente |             0.25 ms |
| Actividad reciente, top 100   |             7.21 ms |

La búsqueda y el detalle se ejecutan en consultas agregadas, sin N+1. Los índices
de Fase 4 por cliente, estado y fecha fueron suficientes para esta escala; no se
añadieron índices especulativos. El benchmark terminó con `ROLLBACK` y una
verificación posterior confirmó cero fixtures de escala.

## Validación

- pgTAP: 242 pruebas totales, 39 nuevas para Fase 5. Cubren límites de aging,
  fechas inclusivas, cargos sin vencimiento, parcialidades, cancelaciones,
  reversiones, monedas, reconciliación, RLS, grants, roles, IDOR y auditoría.
- Vitest: 26 pruebas totales, 6 nuevas para UUID, fechas, rangos, filtros y nombre
  seguro del PDF.
- Concurrencia: 32 snapshots comprobados; solo se observaron saldos completos de
  L 100.00 y L 0.00 durante la confirmación concurrente.
- Playwright: 5 pruebas con Owner, Admin, Finance y Staff, descarga PDF real,
  navegación, denegación, Axe y responsive.
- Responsive: 375, 390, 430, 768, 820, 1024, 1366 y 1440 px en cartera, estado,
  impresión y perfil; sin overflow horizontal accidental.
- Lighthouse autenticado en cartera: Performance 98, Accessibility 100 y Best
  Practices 100. SEO se omite deliberadamente para el admin privado/noindex.
- Dependencias: `pnpm audit` sin vulnerabilidades conocidas y `pnpm outdated`
  sin paquetes reportados al momento de la validación.

## Riesgos residuales

- Medio: el crédito no aplicado se presenta separado, pero su aplicación o
  reembolso operativo pertenece a una fase posterior.
- Bajo: los totales dependen de la fecha operativa de la base; un despliegue en
  otra zona horaria debe conservar la política de `America/Tegucigalpa`.
- Bajo: búsqueda `ILIKE` y agregación en tiempo real son adecuadas para la escala
  validada; deben reevaluarse con un volumen sustancialmente mayor.
- Bajo: el PDF no está firmado digitalmente y se identifica expresamente como
  documento administrativo, no certificación bancaria ni informe auditado.
