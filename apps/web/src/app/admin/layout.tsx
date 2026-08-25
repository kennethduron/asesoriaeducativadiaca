import Link from "next/link";
import {
  BookOpenText,
  CircleDollarSign,
  FileText,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { logout } from "@/lib/auth/actions";
import { hasPermission, requireUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-amber-400 font-bold text-[#0b2341]">
        D
      </span>
      <span>
        <span className="block font-semibold text-white">DIACA</span>
        <span className="block text-xs text-slate-400">Administración</span>
      </span>
    </Link>
  );
}

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const principal = await requireUser();
  const displayName = principal.fullName || principal.email || "Usuario DIACA";
  const canManageUsers = hasPermission(principal, "users.manage");
  const canReadClients = hasPermission(principal, "clients.read");
  const canReadServices = hasPermission(principal, "services.read");
  const canReadCharges = hasPermission(principal, "charges.read");
  const canReadPayments = hasPermission(principal, "payments.read");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-[#071525] px-5 py-6 md:flex">
        <Brand />
        <nav aria-label="Navegación administrativa" className="mt-10 space-y-2">
          <Link
            href="/admin"
            aria-current="page"
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-medium text-white"
          >
            <LayoutDashboard
              className="size-5 text-amber-300"
              aria-hidden="true"
            />
            Inicio
          </Link>
          {canReadClients ? (
            <Link
              href="/admin/clientes"
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <UsersRound
                className="size-5 text-amber-300"
                aria-hidden="true"
              />{" "}
              Clientes
            </Link>
          ) : null}
          {canReadServices ? (
            <Link
              href="/admin/servicios"
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Handshake className="size-5 text-amber-300" aria-hidden="true" />{" "}
              Servicios
            </Link>
          ) : null}
          {canReadCharges ? (
            <Link
              href="/admin/cargos"
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FileText className="size-5 text-amber-300" aria-hidden="true" />
              Cargos
            </Link>
          ) : null}
          {canReadPayments ? (
            <Link
              href="/admin/pagos"
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <CircleDollarSign
                className="size-5 text-amber-300"
                aria-hidden="true"
              />
              Pagos
            </Link>
          ) : null}
          {canManageUsers ? (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400">
              <Settings className="size-5" aria-hidden="true" />
              <span>Configuración</span>
              <span className="ml-auto text-[10px] uppercase">Próxima</span>
            </div>
          ) : null}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Sesión protegida
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Acceso validado por Supabase Auth y políticas RLS.
          </p>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <details className="group relative md:hidden">
              <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-slate-200 text-slate-700 focus-visible:outline-2 focus-visible:outline-amber-500">
                <Menu className="size-5" aria-hidden="true" />
                <span className="sr-only">Abrir navegación</span>
              </summary>
              <nav className="absolute top-12 left-0 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <Link
                  href="/admin"
                  className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 font-medium"
                >
                  <LayoutDashboard className="size-5" aria-hidden="true" />{" "}
                  Inicio
                </Link>
                {canReadClients ? (
                  <Link
                    href="/admin/clientes"
                    className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700"
                  >
                    <UsersRound className="size-5" aria-hidden="true" />{" "}
                    Clientes
                  </Link>
                ) : null}
                {canReadServices ? (
                  <Link
                    href="/admin/servicios"
                    className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-700"
                  >
                    <Handshake className="size-5" aria-hidden="true" />{" "}
                    Servicios
                  </Link>
                ) : null}
                {canReadCharges ? (
                  <Link
                    href="/admin/cargos"
                    className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-slate-700"
                  >
                    <FileText className="size-5" aria-hidden="true" /> Cargos
                  </Link>
                ) : null}
                {canReadPayments ? (
                  <Link
                    href="/admin/pagos"
                    className="mt-1 flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-slate-700"
                  >
                    <CircleDollarSign className="size-5" aria-hidden="true" />
                    Pagos
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className="mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600"
                >
                  <BookOpenText className="size-5" aria-hidden="true" /> Sitio
                  público
                </Link>
              </nav>
            </details>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">
                Rol: {principal.roleName}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:px-4"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
