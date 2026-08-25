insert into public.service_categories (code, name, description, sort_order)
values
  ('academic_advising', 'Asesoría académica', 'Tesis, monografías, informes, metodología y revisión académica.', 10),
  ('civil_legal_services', 'Servicios legales civiles', 'Trámites civiles, contratos y documentación legal.', 20),
  ('professional_writing', 'Redacción profesional', 'Documentos laborales, empresariales y académicos.', 30),
  ('procedures_registrations', 'Trámites y registros', 'Gestión documental, permisos y registros.', 40),
  ('digital_technology', 'Digital y tecnología', 'Herramientas digitales, documentos y soluciones web.', 50),
  ('entrepreneurship_finance', 'Emprendimiento y finanzas', 'Organización inicial, presupuestos y control básico.', 60)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

insert into public.service_catalog (category_id, name, description, standard_price, currency_code)
select c.id, seed.name, seed.description, seed.price, 'HNL'
from (values
  ('academic_advising', 'Revisión académica', 'Revisión de estructura, redacción y normas APA 7.', 1500.00::numeric),
  ('academic_advising', 'Asesoría metodológica', 'Acompañamiento metodológico para proyectos académicos.', 2500.00::numeric),
  ('civil_legal_services', 'Preparación de documento civil', 'Preparación y revisión inicial de documentación civil.', 1800.00::numeric),
  ('professional_writing', 'Currículum profesional', 'Redacción y formato de currículum.', 750.00::numeric),
  ('professional_writing', 'Carta o informe profesional', 'Redacción profesional de documento breve.', 650.00::numeric),
  ('procedures_registrations', 'Orientación de trámite', 'Lista de requisitos y acompañamiento documental.', 1000.00::numeric),
  ('digital_technology', 'Hoja de cálculo personalizada', 'Diseño de hoja de cálculo para operación básica.', 1200.00::numeric),
  ('digital_technology', 'Página web informativa', 'Sitio web informativo de alcance acordado.', null::numeric),
  ('entrepreneurship_finance', 'Presupuesto inicial', 'Organización de costos y presupuesto básico.', 900.00::numeric)
) as seed(category_code, name, description, price)
join public.service_categories c on c.code = seed.category_code
on conflict (category_id, name) do update
set description = excluded.description,
    standard_price = excluded.standard_price,
    currency_code = excluded.currency_code,
    is_active = true;
