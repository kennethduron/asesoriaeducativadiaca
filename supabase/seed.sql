-- Reference RBAC and service catalog data are versioned in migrations. This
-- seed adds only clearly synthetic DEV records. The fixture has no usable
-- password and uses the reserved .invalid domain.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '30000000-0000-0000-0000-000000000001'::uuid,
  'authenticated', 'authenticated', 'seed.staff@diaca.example.invalid', null, now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Operador Sintético DEV"}'::jsonb,
  now(), now()
)
on conflict (id) do nothing;

update public.profiles
set role_id = (select id from public.roles where code = 'staff'),
    status = 'active'
where id = '30000000-0000-0000-0000-000000000001'::uuid;

insert into public.clients (
  id, full_name, client_type, email, phone, whatsapp, address, city, country,
  status, registered_on, notes_summary, created_by, updated_by
)
values
  ('31000000-0000-0000-0000-000000000001', 'Ana Ejemplo Norte', 'individual', 'ana.norte@example.invalid', '+504 9000-1001', '+504 9000-1001', 'Colonia Ficticia 1', 'Tegucigalpa', 'Honduras', 'active', current_date - 40, 'Cliente sintético para pruebas de desarrollo.', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002', 'Carlos Demostración Sur', 'individual', 'carlos.sur@example.invalid', '+504 9000-1002', '+504 9000-1002', null, 'San Pedro Sula', 'Honduras', 'active', current_date - 35, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000003', 'Empresa Modelo Uno', 'business', 'contacto@modelo-uno.example.invalid', '+504 9000-1003', '+504 9000-1103', 'Avenida Simulada 3', 'Comayagua', 'Honduras', 'active', current_date - 30, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', 'Beatriz Prueba Central', 'individual', 'beatriz.central@example.invalid', '+504 9000-1004', null, null, 'La Ceiba', 'Honduras', 'inactive', current_date - 25, 'Registro inactivo usado para comprobar filtros.', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000005', 'Cooperativa Ficticia Azul', 'business', 'azul@example.invalid', '+504 9000-1005', '+504 9000-1105', null, 'Choluteca', 'Honduras', 'active', current_date - 20, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000006', 'Diego Muestra Rivera', 'individual', 'diego.rivera@example.invalid', '+504 9000-1006', null, null, 'Danlí', 'Honduras', 'active', current_date - 18, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000007', 'Estudio Simulado Beta', 'business', 'beta@example.invalid', '+504 9000-1007', '+504 9000-1107', null, 'Tegucigalpa', 'Honduras', 'active', current_date - 14, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000008', 'Fernanda Caso Oeste', 'individual', 'fernanda.oeste@example.invalid', '+504 9000-1008', '+504 9000-1008', null, 'Santa Rosa de Copán', 'Honduras', 'active', current_date - 10, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000009', 'Grupo Demostración Verde', 'business', 'verde@example.invalid', '+504 9000-1009', null, null, 'El Progreso', 'Honduras', 'inactive', current_date - 7, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000010', 'Gabriel Registro Este', 'individual', 'gabriel.este@example.invalid', '+504 9000-1010', '+504 9000-1010', null, 'Juticalpa', 'Honduras', 'active', current_date - 3, null, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.client_notes (id, client_id, note, created_by)
values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Solicitó seguimiento por WhatsApp durante horario laboral.', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000003', 'Pendiente confirmar el alcance final del documento.', '30000000-0000-0000-0000-000000000001'),
  ('32000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000005', 'Prefiere reuniones virtuales.', '30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.client_services (
  id, client_id, service_id, custom_description, start_date, end_date,
  agreed_price, currency_code, billing_mode, status, created_by, updated_by
)
values
  ('33000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', (select id from public.service_catalog where name = 'Revisión académica'), 'Revisión de un informe de graduación.', current_date - 20, null, 1700, 'HNL', 'one_time', 'active', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', (select id from public.service_catalog where name = 'Currículum profesional'), null, current_date - 12, current_date - 10, 750, 'HNL', 'one_time', 'completed', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', (select id from public.service_catalog where name = 'Preparación de documento civil'), null, current_date - 8, null, 2000, 'HNL', 'custom', 'pending', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000005', (select id from public.service_catalog where name = 'Presupuesto inicial'), null, current_date - 5, null, 900, 'HNL', 'one_time', 'active', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
