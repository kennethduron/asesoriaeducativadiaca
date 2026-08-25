import Link from "next/link";
import {
  CircleDollarSign,
  FileText,
  FileBarChart,
  Handshake,
  UsersRound,
} from "lucide-react";

import { hasPermission, requireUser } from "@/lib/auth/authorization";

export default async function AdminPage() {
  const principal = await requireUser();
  const displayName = principal.fullName || principal.email || "usuario";
  const modules = [
    hasPermission(principal, "clients.read")
      ? {
          name: "Clientes",
          detail: "Listado y Perfil 360°",
          icon: UsersRound,
          href: "/admin/clientes",
        }
      : null,
    hasPermission(principal, "services.read")
      ? {
          name: "Servicios",
          detail: "Catálogo y categorías",
          icon: Handshake,
          href: "/admin/servicios",
        }
      : null,
    hasPermission(principal, "charges.read")
      ? {
          name: "Cargos",
          detail: "Cuentas por cobrar y saldos derivados",
          icon: FileText,
          href: "/admin/cargos",
        }
      : null,
    hasPermission(principal, "payments.read")
      ? {
          name: "Pagos",
          detail: "Asignaciones, recibos y anulaciones",
          icon: CircleDollarSign,
          href: "/admin/pagos",
        }
      : null,
    {
      name: "Reportes",
      detail: "Disponible posteriormente",
      icon: FileBarChart,
    },
  ].filter((item) => item !== null);
  return (
    <div>
      <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
        Panel administrativo
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Bienvenido, {displayName}
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Tu sesión está activa con el rol <strong>{principal.roleName}</strong>.
        Los módulos disponibles respetan tus permisos y cada operación
        financiera crítica queda auditada.
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
      <section aria-labelledby="modules" className="mt-10">
        <h2 id="modules" className="text-xl font-semibold">
          Módulos
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ name, detail, icon: Icon, ...item }) => (
            <article
              key={name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-slate-100 text-[#0b2341]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold">{name}</h3>
              <p className="mt-2 text-sm text-slate-500">{detail}</p>
              {"href" in item && item.href ? (
                <Link
                  href={item.href}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-[#17365d]"
                >
                  Abrir módulo →
                </Link>
              ) : (
                <span className="mt-4 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Próximamente
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
