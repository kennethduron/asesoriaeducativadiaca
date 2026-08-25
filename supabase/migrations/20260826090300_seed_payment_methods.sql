insert into public.payment_methods (code, name, sort_order)
values
  ('cash', 'Efectivo', 10),
  ('transfer', 'Transferencia bancaria', 20),
  ('deposit', 'Depósito bancario', 30),
  ('card', 'Tarjeta', 40),
  ('other', 'Otro', 50)
on conflict (code) do update
set name = excluded.name,
    sort_order = excluded.sort_order;
