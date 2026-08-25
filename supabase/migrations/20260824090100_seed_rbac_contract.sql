insert into public.roles (code, name, description)
values
  ('owner', 'Propietario', 'Control empresarial completo.'),
  ('admin', 'Administrador', 'Operación administrativa sin control de usuarios ni ajustes críticos.'),
  ('finance', 'Finanzas', 'Operación financiera de menor privilegio.'),
  ('staff', 'Personal', 'Atención de clientes y servicios sin permisos financieros.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    is_active = true;

insert into public.permissions (code, name, description)
values
  ('clients.read', 'Leer clientes', 'Consultar clientes.'),
  ('clients.write', 'Gestionar clientes', 'Crear y actualizar clientes.'),
  ('services.read', 'Leer servicios', 'Consultar servicios.'),
  ('services.write', 'Gestionar servicios', 'Crear y actualizar servicios.'),
  ('charges.read', 'Leer cargos', 'Consultar cargos.'),
  ('charges.write', 'Gestionar cargos', 'Crear y actualizar cargos.'),
  ('charges.cancel', 'Cancelar cargos', 'Cancelar cargos emitidos.'),
  ('payments.read', 'Leer pagos', 'Consultar pagos.'),
  ('payments.create', 'Crear pagos', 'Registrar pagos.'),
  ('payments.confirm', 'Confirmar pagos', 'Confirmar pagos registrados.'),
  ('payments.void', 'Anular pagos', 'Anular pagos confirmados.'),
  ('reports.read', 'Leer reportes', 'Consultar reportes.'),
  ('reports.export', 'Exportar reportes', 'Exportar reportes.'),
  ('bank_reports.generate', 'Generar reporte bancario', 'Generar reportes bancarios.'),
  ('settings.manage', 'Gestionar configuración', 'Modificar configuración del sistema.'),
  ('users.manage', 'Gestionar usuarios', 'Gestionar perfiles, estados y roles.'),
  ('audit.read', 'Leer auditoría', 'Consultar el registro de auditoría.')
on conflict (code) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles as r
cross join public.permissions as p
where r.code = 'owner'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles as r
join public.permissions as p on p.code = any (array[
  'clients.read', 'clients.write', 'services.read', 'services.write',
  'charges.read', 'charges.write', 'payments.read', 'payments.create',
  'payments.confirm', 'reports.read', 'reports.export', 'audit.read'
])
where r.code = 'admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles as r
join public.permissions as p on p.code = any (array[
  'clients.read', 'services.read', 'charges.read', 'charges.write',
  'payments.read', 'payments.create', 'payments.confirm',
  'reports.read', 'reports.export'
])
where r.code = 'finance'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles as r
join public.permissions as p on p.code = any (array[
  'clients.read', 'clients.write', 'services.read', 'services.write'
])
where r.code = 'staff'
on conflict do nothing;
