# Asesoría Educativa DIACA

Sistema web profesional para una empresa hondureña de asesoría académica, legal civil y profesional.

## Incluye

- Landing page pública responsive con identidad DIACA.
- CRM separado en `crm.html` con login demo y sesión local.
- Secciones de servicios académicos, legales, profesionales, digitales y financieros.
- CRM operativo con prospectos, clientes, casos, tareas, pipeline, plantillas de WhatsApp, seguimiento por historial y exportación CSV.
- Ficha de prospecto con prioridad, próximo seguimiento, notas de historial y acción directa por WhatsApp.
- Persistencia temporal con `localStorage`.
- Preparación para Supabase como base de datos, Vercel como API de seguridad y Firebase solo para Hosting y Cloud Messaging.
- Esquema SQL inicial en `supabase/schema.sql`.

## Uso local

Abre `index.html` para el sitio público y `crm.html` para el CRM. También puedes servir la carpeta con cualquier servidor estático.

```bash
npx serve .
```

## Acceso demo del CRM

- Correo: `admin@diaca.hn`
- Contraseña: `diaca2026`

Este login es solo para demo local. En producción debe reemplazarse por Supabase Auth.

## Integraciones pendientes

Cuando tengas las credenciales, se reemplazan los valores vacíos de `js/config.example.js`:

- Supabase URL
- Supabase anon key
- Firebase web app config para Cloud Messaging
- Firebase Cloud Messaging VAPID key

## Datos de marca usados

- Empresa: Asesoría Educativa DIACA
- Correo: asesoriaeducativadiaca@gmail.com
- Teléfono/WhatsApp: +504 9818-5221
- Actividad principal: servicios de asesoría en general.
- Servicios: asesoría académica, servicios legales civiles, redacción profesional, trámites, tecnología, emprendimiento y finanzas.

## Próximo nivel

La versión actual queda lista para Firebase Hosting. La siguiente fase es conectar:

1. Base de datos con Supabase.
2. API de seguridad y validación de acceso con Vercel.
3. Notificaciones push con Firebase Cloud Messaging.
4. Repositorio GitHub con rama principal y control de versiones.
