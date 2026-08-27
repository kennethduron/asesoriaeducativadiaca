# Incidente puntual: recuperación de contraseña Production

Fecha: 2026-08-27.

## Alcance y diagnóstico

- Proyecto Supabase: `jowbnimjujbllqclpdyq`.
- Site URL: `https://asesoriaeducativadiaca.com`.
- Redirect URL oficial permitida:
  `https://asesoriaeducativadiaca.com/auth/callback`.
- El enlace anterior entregado por correo usaba el host del proyecto Supabase,
  pathname `/auth/v1/verify` y únicamente los parámetros esperados `token`,
  `type=recovery` y `redirect_to`. El `redirect_to` apuntaba a
  `/auth/callback?next=/restablecer-contrasena` en el dominio oficial.
- No existían destinos a localhost, Preview, Firebase, DEV ni deployments
  temporales.
- Resend confirmó entrega. Vercel no registró una llegada a `/auth/callback`
  para el intento afectado, por lo que la aplicación no recibió ni perdió los
  parámetros. Los Auth Logs de Supabase no ofrecieron un evento reciente
  utilizable en ese momento.

El flujo anterior dependía de `ConfirmationURL` y del intercambio PKCE en el
callback SSR. Supabase documenta que filtros de correo pueden precargar y
consumir una URL de confirmación antes del clic humano. Esa condición explica
que el intento se detuviera antes de Vercel y, junto con la dependencia del
verificador PKCE, hacía el recovery frágil al abrirse desde otro contexto.

## Corrección aplicada

- Runtime Production: commit `acbc552`.
- La plantilla Recovery usa ahora el dominio oficial y envía `token_hash` y
  `type=recovery` a `/restablecer-contrasena`.
- La visita GET no consume el token. Presenta una confirmación explícita y sólo
  el POST del usuario ejecuta `verifyOtp`.
- Tras verificar, la URL queda limpia, se muestra el formulario de contraseña,
  `updateUser` establece la nueva contraseña y el flujo cierra sesiones antes
  de volver a `/login?password=updated`.
- El callback PKCE se conserva para los demás flujos existentes.
- No se modificaron usuarios, UUIDs, perfiles, roles ni datos de negocio.

Validación:

- 66 pruebas Vitest, 12 pruebas de seguridad, lint, typecheck y build: PASS.
- Deployment Production `69VTmkNCo2bELQK6UQmCrwr2PwbY`: READY.
- Prueba end-to-end con hash sintético: el dominio oficial mostró la
  confirmación, procesó el POST y rechazó correctamente el hash inválido como
  `expired`, sin tocar una cuenta real.

## Deliverability, separado del fix técnico

- From: `DIACA Acceso <acceso@mail.asesoriaeducativadiaca.com>`.
- SPF publicado en `send.mail.asesoriaeducativadiaca.com` mediante Amazon SES.
- DKIM publicado en
  `resend._domainkey.mail.asesoriaeducativadiaca.com`.
- Return-Path configurado por el subdominio `send.mail` y MX de Amazon SES.
- DMARC publicado en `_dmarc.asesoriaeducativadiaca.com` con `p=none`.
- Resend mantiene dominio, DKIM, SPF y MX como verificados. From, DKIM y
  Return-Path pertenecen al mismo dominio organizacional y son compatibles con
  alineación DMARC relajada.

No se requiere ni se realizó un cambio DNS. La clasificación inicial como Spam
es un asunto de reputación de dominio/remitente nuevo, no un fallo técnico de
Auth. Medidas operativas: marcar el mensaje como “No es spam”, mantener From y
volumen consistentes, evitar tracking en correos Auth y observar entregas antes
de endurecer DMARC desde `p=none`.

Referencias oficiales:

- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/auth-verifyotp
