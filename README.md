# Asesoria Educativa DIACA

Sistema web profesional para una empresa hondurena de asesoria academica, legal civil y profesional.

## Incluye

- Landing page publica responsive con identidad DIACA.
- CRM separado en `crm.html` con login demo y sesion local.
- Secciones de servicios academicos, legales, profesionales, digitales y financieros.
- CRM operativo con prospectos, clientes, casos, tareas, pipeline, plantillas de WhatsApp, seguimiento por historial y exportacion CSV.
- Ficha de prospecto con prioridad, proximo seguimiento, notas de historial y accion directa por WhatsApp.
- Persistencia temporal con `localStorage`.
- Preparacion para Supabase, Vercel y Firebase Cloud Messaging.
- Esquema SQL inicial en `supabase/schema.sql`.

## Uso local

Abre `index.html` para el sitio publico y `crm.html` para el CRM. Tambien puedes servir la carpeta con cualquier servidor estatico.

```bash
npx serve .
```

## Acceso demo del CRM

- Correo: `admin@diaca.hn`
- Contrasena: `diaca2026`

Este login es solo para demo local. En produccion debe reemplazarse por Supabase Auth.

## Integraciones pendientes

Cuando tengas las credenciales, se reemplazan los valores vacios de `js/config.example.js`:

- Supabase URL
- Supabase anon key
- Firebase web app config
- Firebase Cloud Messaging VAPID key

## Datos de marca usados

- Empresa: Asesoria Educativa DIACA
- Correo: asesoriaeducativadiaca@gmail.com
- Telefono/WhatsApp: +504 9818-5221
- Actividad principal: servicios de asesoria en general.
- Servicios: asesoria academica, servicios legales civiles, redaccion profesional, tramites, tecnologia, emprendimiento y finanzas.

## Proximo nivel

La version actual queda lista para GitHub y Vercel como frontend. La siguiente fase es conectar:

1. Autenticacion y base de datos con Supabase.
2. Notificaciones push con Firebase Cloud Messaging.
3. Deploy de produccion en Vercel.
4. Repositorio GitHub con rama principal y control de versiones.
