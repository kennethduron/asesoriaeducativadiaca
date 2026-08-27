# Fase 8: auditoría pre-cutover

> Evidencia histórica previa a la conversión. La decisión y el estado vigente
> están en `phase-8-blocker-closure.md`; cualquier propuesta de proyecto nuevo
> o Supabase Pro en este documento quedó sustituida el 2026-08-26.

Fecha de corte: 2026-08-26. Esta evidencia no autoriza todavía crear
Supabase Production, configurar secretos Production ni cambiar DNS/dominio.

## Identidad de los entornos

| Componente | Identidad | Estado registrado |
|---|---|---|
| Git | `feat/diaca-production-cutover` desde `c2d68e1542e9ab123a715b8c44cd98d8fd16d687` | aislado de `main` |
| Supabase Legacy | `diaca-crm` / `tpsawftowibxzsgeqrhx` | pausado tras cerrar el inventario local |
| Supabase definitivo | `diaca-development` / `jowbnimjujbllqclpdyq` | convertido y reconciliado como Production |
| Supabase adicional | no existe | no crear |
| Next Vercel | `prj_yHMbgR0IeWnIEIQj3qQUlRPJ5AKa` / Ken Code | sin cambios Production |
| API Legacy | `prj_jmYWABaclYnMqvPoGS2e0fNCfS8O` | operativo, conservar |
| Web oficial | Firebase Hosting | operativo, conservar para rollback |
| Car Zone | proyecto ajeno a DIACA | fuera de alcance; no tocar |

## Backup Legacy

Se generó un backup lógico fuera del repositorio, con ACL limitada al usuario
local y `SYSTEM`. Incluye roles y los schemas `public`, `auth` y `storage`, con
schema y datos separados. No contiene claves de proyecto, connection strings
ni valores de configuración de proveedores.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `roles.sql` | 358 | `4350A72B5EC109888E740C17F3EB4DA2FCD95AB73AF26499538ED0BF615DB543` |
| `public-schema.sql` | 10405 | `29487528628DC89B20BA80892E24768934C9430590BEDAF01A08AD8A6252FB21` |
| `public-data.sql` | 7137 | `B8C745CF482C3DCF0FEF02FB1AE178D41BF63403F008D509856179B5137482B3` |
| `auth-schema.sql` | 46591 | `384B9181A7FB38EE5E281967D62079E517D999149AC8C841D4ADF2DDAA4780D4` |
| `auth-data.sql` | 63372 | `8C7E1FD3C91EF5AB15B7A8111C5452BB7F6C44503E0F202EFEB734D4D58FE2CA` |
| `storage-schema.sql` | 49940 | `1EC3454065163CB22F89587979DAC4AB60247D52064F35521E7B5A8A8B44F18D` |
| `storage-data.sql` | 2669 | `1E76880815FB8992C5E59333E87B589CB63AAF37C6307A7E3CB2113EE11FE923` |

Los dumps `public` y `auth` fueron restaurados en bases PostgreSQL locales
aisladas. Los conteos coincidieron y las bases/copies temporales fueron
eliminadas después del drill. El backup restringido se conserva.

Incidente de herramienta: `supabase db dump --dry-run` imprimió una credencial
efímera del rol passwordless interno `cli_login_postgres`. No era la contraseña
permanente del proyecto. No se registró su valor y no se reutilizó el modo
`--dry-run`.

## Inventario Legacy reconciliado

| Entidad | Filas | Validación |
|---|---:|---|
| `auth.users` | 3 | cada usuario tiene identidad |
| `auth.identities` | 3 | cero identidades huérfanas |
| `crm_admins` | 3 | correspondencia exacta por email con Auth |
| `tasks` | 13 | todas abiertas, título y fecha presentes |
| `push_tokens` | 9 | únicos y asociados a usuarios Auth |
| `leads` | 0 | sin datos remotos |
| `clients` | 0 | sin datos remotos |
| `cases` | 0 | sin datos remotos |
| `payments` | 0 | sin datos remotos |
| Storage objects/buckets | 0 | no hay binarios que migrar |
| Edge Functions | 0 | integraciones están en Vercel |

Las 13 tareas usan tres etiquetas de equipo que no coinciden con emails,
usernames ni metadata de los usuarios: Equipo DIACA (8), Equipo legal (3) y
Equipo académico (2). El owner aprobó conservar las 13 con `assigned_to=NULL`
y guardar la etiqueta únicamente en `migration_metadata`; no se inventarán
responsables. Owner/Admin podrán reasignarlas después del cutover.

Los tres usuarios Auth están confirmados, tienen hash bcrypt soportado, usan
exclusivamente el proveedor email y no están borrados, bloqueados ni marcados
como anónimos. Se preservarán UUID, email y hash mediante la API administrativa
soportada. El usuario que coincide con el Owner actual de la organización será
Owner inicial; los otros dos miembros de `crm_admins` serán Admin. No se
migrarán las 70 sesiones ni los 115 refresh tokens: pertenecen al entorno
Legacy y deben quedar invalidados.

Los tokens push Legacy no deben copiarse a `task_push_tokens`: pertenecen al
service worker/origen Legacy y el nuevo modelo los asocia a un perfil concreto.
Los usuarios deberán registrar nuevamente un dispositivo en la nueva app.

## Discrepancia del estado local histórico

La verificación manual del perfil histórico, sin leer
`diaca-crm-session`, reportó `diaca-crm-state` con 4 leads, 3 clientes,
3 casos y 3 tareas. El remoto Legacy contiene 0 leads, 0 clientes, 0 casos
y 13 tareas.

El código Legacy explica cómo pudo producirse la divergencia:

- `seedData` contiene exactamente 4 leads, 3 clientes, 3 casos y 3 tareas.
- `loadState()` inicializa o recupera `diaca-crm-state` y vuelve a guardarlo.
- La integración Supabase introducida en `1ac2e79` carga el remoto y reemplaza
  el estado local solamente después de una autenticación remota válida.
- No existe importación masiva ni sincronización local-a-remoto. Las escrituras
  posteriores son por operación individual; clientes y casos no tienen un
  flujo de persistencia remota equivalente en esa interfaz.

Una comparación read-only por campos semánticos determinó que 0 de las 13
tareas remotas coinciden con las tareas de las dos versiones conocidas del
fixture. No se expuso contenido del backup.

La verificación manual posterior confirmó que la clave existe y que las cuatro
colecciones (`leads`, `clients`, `cases` y `tasks`) coinciden exactamente con
los fixtures conocidos mediante las huellas calculadas en el navegador,
omitiendo todos los campos `id`. No se leyó ni modificó `diaca-crm-session`.

Dictamen final: **estado local sintético/obsoleto**. Los 4 leads, 3 clientes,
3 casos y 3 tareas locales quedan excluidos de migración. Las 13 tareas remotas
no coinciden con los fixtures, se conservan íntegramente en Legacy y mantienen
su clasificación de reales o potencialmente reales hasta que el owner de
negocio apruebe vigencia y responsables.

Procedimiento de cierre:

1. Obtener solamente conteos y huellas por colección desde
   `diaca-crm-state`; no leer ni modificar la clave de sesión.
2. Si una colección coincide exactamente con un fixture conocido,
   clasificarla como sintética/obsoleta y excluirla de migración.
3. Para cada colección que no coincida, obtener solo metadatos mínimos
   no sensibles (campos presentes y rangos temporales), mantenerla como
   indeterminada y someter su contenido a revisión del owner antes de exportar.
4. Si se confirma información real, exportarla de forma controlada, mapearla,
   hacer backup y reconciliar conteos, duplicados, relaciones y muestras antes
   de cualquier importación.
5. Pausar `diaca-crm` únicamente después de cerrar esta clasificación y
   conservar el backup verificado.

Procedimiento completado el 2026-08-26. Supabase confirmó el estado
`Project "diaca-crm" is paused`; la consola indicó que todos los datos,
backups y objetos permanecen seguros y que el proyecto puede reanudarse hasta
el 30 de septiembre de 2027. La pausa fue reversible: no se borró, exportó ni
modificó ninguna de las 13 tareas remotas ni el backup Legacy verificado.

## Mapa de migración propuesto

| Fuente Legacy | Destino | Transformación | Control |
|---|---|---|---|
| `auth.users` + `crm_admins` | `auth.users` + `profiles` | API Admin preserva UUID/email/hash bcrypt; 1 Owner + 2 Admin; fallback obligatorio a reset si un hash falla | 3 usuarios, 3 perfiles, cero sesiones/tokens Legacy |
| `tasks` | `tasks` | conservar ID/título/fecha/estado; `assigned_to=NULL`; etiqueta en `migration_metadata` | 13 origen = 13 destino; 13 sin asignar; etiquetas 8/3/2 |
| `push_tokens` | no migrar | re-registro controlado por usuario/dispositivo | destino inicia en cero |
| `leads` | Legacy temporal | no hay filas; proxy sigue en `bih6` hasta retiro separado | GET Legacy mantiene contrato |
| `clients`, `cases`, `payments` | sin importación | no hay filas remotas | destino permanece vacío |
| estado `localStorage` del CRM | no migrar | las cuatro colecciones coinciden exactamente con fixtures conocidos | clasificación cerrada sin leer sesiones ni exportar contenido |

No se migrarán sesiones ni refresh tokens Legacy. Production usa un JWT secret
nuevo, de modo que el primer login siempre crea una sesión nueva. Si la API
rechaza cualquier hash, ese usuario usará recuperación/invitación controlada;
nunca se inventará una contraseña.

## Diferencias de configuración

- Auth Legacy permite email y signup; Production debe deshabilitar signup
  público y configurar redirects/SMTP del dominio final.
- Resend Preview usa `resend.dev` y la credencial auditada no es válida. Se
  requiere dominio verificado y credencial Production nueva.
- Firebase DIACA puede conservarse para FCM sin tocar Hosting. Production debe
  usar una cuenta de servicio dedicada diferente de Preview y Legacy.
- Production Vercel solo tiene actualmente `NEXT_PUBLIC_SITE_URL` y
  `LEADS_API_URL`; no tiene Supabase Production ni proveedores Production.
- El DNS oficial sigue apuntando a Firebase. No cambiar antes del GO firmado.

## Decisión sustituida

El estado vigente está en `docs/operations/phase-8-blocker-closure.md`:
`jowbnimjujbllqclpdyq` se reutilizó como backend Production, sin Pro, PITR ni
tercer proyecto. Auth, tareas, migrations, RLS, backup/restore y aislamiento
Vercel quedaron reconciliados.

La verificación manual DNS/Resend continúa pendiente por instrucción expresa y
es obligatoria antes de invitaciones, resets o cutover. DNS, Firebase Hosting,
dominio oficial y cutover siguen fuera de alcance.

## Certificación de instalación limpia

La base local fue reconstruida aplicando las 23 migrations con
`db reset --no-seed`. `db lint --schema public` no encontró errores y las seis
suites pgTAP pasaron con 321/321 pruebas. Tres suites recibieron fixtures
transaccionales propios para eliminar su dependencia accidental del seed DEV;
no se modificó schema, RLS, RPC ni comportamiento de aplicación.
