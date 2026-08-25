import {
  CircleDollarSign,
  FileBarChart,
  Handshake,
  UsersRound,
} from "lucide-react";

import { requireUser } from "@/lib/auth/authorization";

const upcomingModules = [
  { name: "Clientes", phase: "Disponible en Fase 3", icon: UsersRound },
  { name: "Servicios", phase: "Disponible en Fase 3", icon: Handshake },
  { name: "Pagos", phase: "Disponible posteriormente", icon: CircleDollarSign },
  { name: "Reportes", phase: "Disponible posteriormente", icon: FileBarChart },
] as const;

export default async function AdminPage() {
  const principal = await requireUser();
  const displayName = principal.fullName || principal.email || "usuario";

  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Panel administrativo
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Bienvenido, {displayName}
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Tu sesión está activa con el rol <strong>{principal.roleName}</strong>.
        Esta fase establece la base segura; los módulos operativos se
        habilitarán en las siguientes fases.
      </p>

      <section
        aria-labelledby="system-status"
        className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
      >
        <h2 id="system-status" className="font-semibold text-emerald-950">
          Estado del sistema
        </h2>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          Autenticación activa · Perfil activo · Autorización RLS habilitada
        </p>
      </section>

      <section aria-labelledby="upcoming" className="mt-10">
        <h2 id="upcoming" className="text-xl font-semibold text-slate-950">
          Próximos módulos
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {upcomingModules.map(({ name, phase, icon: Icon }) => (
            <article
              key={name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#0b2341]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold text-slate-950">{name}</h3>
              <p className="mt-2 text-sm text-slate-500">{phase}</p>
              <span className="mt-4 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Próximamente
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
