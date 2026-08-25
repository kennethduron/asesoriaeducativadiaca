# Fase 6: dashboard, reportes y exportaciones

## Alcance

Fase 6 convierte los datos operativos de Fases 3-5 en información administrativa. No crea una segunda contabilidad, no convierte monedas, no persiste exports y no incluye conciliación o reporte bancario. La producción oficial continúa en Firebase; Next y Supabase Development siguen siendo staging.

## Definiciones de los KPI

- **Clientes activos:** clientes cuyo `clients.status` es `active` al consultar el dashboard.
- **Nuevos clientes:** clientes cuya `registered_on` cae dentro del período inclusivo seleccionado.
- **Servicios activos:** contratos de `client_services` con `status = active` al consultar el dashboard. `pending`, `suspended`, `completed` y `cancelled` no se cuentan.
- **Facturado:** suma de `charges.amount` con `charge_date` dentro del período y `status <> cancelled`.
- **Cobrado:** suma de `payments.amount` con `payment_date` dentro del período y estado vigente `confirmed`. Un pago `voided` no cuenta como ingreso vigente.
- **Saldo pendiente (outstanding):** suma de `client_account_summary.outstanding_balance`.
- **Saldo vencido (overdue):** suma de `client_account_summary.overdue_balance`. Un cliente está en morosidad cuando este valor es mayor que cero.
- **Crédito no aplicado (unapplied):** suma de `client_account_summary.unapplied_credit`. Se muestra por separado y nunca reduce automáticamente el saldo vencido.

`Facturado` y `Cobrado` son conceptos distintos. Un cargo de 1,000 y un pago confirmado de 400 producen facturado 1,000, cobrado 400 y saldo pendiente 600 cuando la asignación correspondiente está vigente.

## Períodos y zona horaria

La UI acepta `today`, `week`, `month`, `previous_month`, `last_30_days`, `year` y `custom`. Todos se convierten en el servidor a límites inclusivos `from`/`to` usando `America/Tegucigalpa`. Un rango personalizado no puede ser futuro, invertido ni mayor de 731 días.

El período anterior tiene exactamente la misma cantidad de días y termina el día anterior a `from`. Si el valor previo es cero, la tendencia se presenta como `Nuevo` cuando el actual es positivo o como em dash cuando ambos son cero; nunca se divide por cero.

## Multi-moneda

Los KPI, series, aging, resúmenes y exports monetarios se consultan con una moneda ISO de tres letras. HNL y USD nunca se suman. Los reportes que permiten varias monedas conservan `currency_code` en cada fila y generan resúmenes independientes por moneda.

## Arquitectura de consulta

`get_dashboard_summary(from_date, to_date, currency_filter)` devuelve un único snapshot JSON de una sentencia PostgreSQL. Contiene KPI actuales/anteriores, series, aging, top morosidad, actividad reciente y servicios. Las secciones se incluyen según permisos; un usuario Staff no ejecuta ni recibe agregados financieros.

`get_report_data(...)` usa ramas SQL estáticas por tipo de reporte y allowlists para filtros y orden. No concatena `ORDER BY` desde entrada. La UI solicita 20, 50 o 100 filas; un export autenticado puede solicitar el conjunto filtrado hasta un límite de 5,000 filas. Los reportes son:

1. clientes;
2. servicios;
3. cargos;
4. pagos;
5. cuentas por cobrar;
6. morosidad/aging.

Las páginas son Server Components dinámicos y usan el cliente Supabase SSR del usuario. Los gráficos son Client Components pequeños que reciben datos serializables. Dashboard, reportes y Route Handlers son privados y no se almacenan en una caché compartida.

## Permisos

- `clients.read` habilita métricas/reporte de clientes.
- `services.read` habilita métricas/reporte de servicios.
- `reports.read` más `charges.read` y/o `payments.read` habilita cada reporte financiero correspondiente.
- `reports.export` es adicional para Excel/PDF.
- Owner, Admin y Finance conservan la matriz sembrada; Staff solo ve datos no financieros autorizados.
- perfiles `inactive` y usuarios anónimos no obtienen datos.

Las funciones `SECURITY DEFINER` usan `search_path = ''`, nombres calificados, validación de `auth.uid()`/permisos, `PUBLIC EXECUTE` revocado y grants mínimos a `authenticated`.

## Exportaciones

Excel se genera con ExcelJS 4.4.0. Los montos son celdas numéricas, las fechas son fechas y las monedas se identifican explícitamente. Texto de usuario que empieza por `=`, `+`, `-` o `@` se antepone con apóstrofo para impedir formula injection.

PDF reutiliza `@react-pdf/renderer` 4.6.1 en Letter landscape para tablas anchas, con encabezado, filtros, resumen por moneda, pie y número de página. Ningún texto se interpreta como HTML.

Los Route Handlers validan sesión, perfil activo, permisos, tipo/filtros, límite y filename. Responden `Cache-Control: private, no-store`, `Content-Disposition: attachment` y auditan `report.exported` únicamente después de generar exitosamente el archivo. El audit guarda tipo, formato, filtros normalizados, cantidad y correlation ID; nunca el archivo.

Los enlaces a XLSX y PDF deshabilitan explícitamente el prefetch de Next.js. Una exportación es una operación autenticada y auditable: solo debe generarse por una acción deliberada del usuario, nunca por anticipación del router al renderizar o recorrer la página.

Los límites son 5,000 filas para XLSX y 250 para PDF. La medición local de 1,000 filas PDF anchas consumió unos 291 MB de heap adicional y 52.9 segundos, por lo que la ruta PDF síncrona usa deliberadamente el límite más seguro.

## Rendimiento y responsive

El dashboard usa un RPC, no una secuencia N+1. Los reportes paginan en servidor y el navegador nunca recibe datasets completos ocultos. Se medirán agregados con 500 clientes y al menos 2,500 cargos sintéticos; solo se agregarán índices con evidencia de `EXPLAIN ANALYZE`.

Las tablas se muestran en desktop y cambian a cards en móvil. Filtros y acciones tienen al menos 44 px, los gráficos tienen resumen/tabla textual y ningún flujo depende exclusivamente de hover o color. Se validan 375, 390, 430, 768, 820, 1024, 1366 y 1440 px.

## Pruebas y límites conocidos

Vitest cubre períodos, comparación, dinero, series, filtros, sorting, filenames, formula injection y view models. pgTAP cubre agregados, permisos, monedas, anulaciones, cancelaciones, aging y separación aplicado/no aplicado. Playwright cubre roles, filtros, exports, móvil y Axe.

No pertenecen a Fase 6: reporte o formato bancario, conciliación, almacenamiento histórico de exports, jobs asíncronos, tipo de cambio, Supabase Production, cutover, dominio oficial y backups/restore de producción. Esos temas corresponden a Fases 7-8.
