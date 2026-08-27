"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileBarChart,
  FileText,
  Handshake,
  LayoutDashboard,
  Inbox,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { logout } from "@/lib/auth/actions";
import { isAdminNavigationItemActive } from "@/lib/navigation/admin";
import { cn } from "@/lib/utils";

const SIDEBAR_PREFERENCE_KEY = "diaca:admin-sidebar-collapsed";

type NavigationPermissions = {
  clients: boolean;
  requests: boolean;
  services: boolean;
  tasks: boolean;
  charges: boolean;
  payments: boolean;
  statements: boolean;
  reports: boolean;
  users: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: keyof NavigationPermissions;
};

const navigationItems: NavigationItem[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboard },
  {
    href: "/admin/solicitudes",
    label: "Solicitudes",
    icon: Inbox,
    permission: "requests",
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    icon: UsersRound,
    permission: "clients",
  },
  {
    href: "/admin/servicios",
    label: "Servicios",
    icon: Handshake,
    permission: "services",
  },
  {
    href: "/admin/tareas",
    label: "Tareas",
    icon: ClipboardList,
    permission: "tasks",
  },
  {
    href: "/admin/cargos",
    label: "Cargos",
    icon: FileText,
    permission: "charges",
  },
  {
    href: "/admin/pagos",
    label: "Pagos",
    icon: CircleDollarSign,
    permission: "payments",
  },
  {
    href: "/admin/estados-de-cuenta",
    label: "Estados de cuenta",
    icon: WalletCards,
    permission: "statements",
  },
  {
    href: "/admin/reportes",
    label: "Reportes",
    icon: FileBarChart,
    permission: "reports",
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: Settings,
    permission: "users",
  },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/admin"
      aria-label={compact ? "DIACA · Ir al inicio" : undefined}
      className={cn(
        "admin-brand group flex min-h-11 items-center rounded-xl focus-visible:outline-none",
        compact ? "justify-center" : "gap-3",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-400 font-bold text-[#0b2341] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
        D
      </span>
      {!compact ? (
        <span className="min-w-0">
          <span className="block font-semibold text-white">DIACA</span>
          <span className="block text-xs text-slate-400">Administración</span>
        </span>
      ) : null}
    </Link>
  );
}

function Navigation({
  permissions,
  collapsed = false,
  onNavigate,
  id,
}: {
  permissions: NavigationPermissions;
  collapsed?: boolean;
  onNavigate?: () => void;
  id?: string;
}) {
  const pathname = usePathname();
  const visibleItems = navigationItems.filter(
    (item) => !item.permission || permissions[item.permission],
  );

  return (
    <nav id={id} aria-label="Navegación administrativa" className="space-y-1.5">
      {visibleItems.map((item) => {
        const active = isAdminNavigationItemActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            data-tooltip={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={cn(
              "admin-nav-item group relative flex min-h-12 items-center rounded-xl font-medium outline-none",
              "transition-[background-color,color,box-shadow,transform] duration-200",
              "focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071525]",
              collapsed ? "justify-center px-0" : "gap-3 px-4",
              active
                ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                : "text-slate-300 hover:bg-white/8 hover:text-white active:translate-y-px",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-300 transition-opacity duration-200",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon
              className={cn(
                "size-5 shrink-0 transition-colors duration-200",
                active
                  ? "text-amber-300"
                  : "text-amber-300/75 group-hover:text-amber-300",
              )}
              aria-hidden="true"
            />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SessionProtection({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div
        className="grid size-11 place-items-center self-center rounded-xl border border-white/10 bg-white/5 text-emerald-300"
        title="Sesión protegida"
        aria-label="Sesión protegida"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm text-emerald-300">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Sesión protegida
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        Acceso validado por Supabase Auth y políticas RLS.
      </p>
    </div>
  );
}

export function AdminShell({
  children,
  displayName,
  roleName,
  permissions,
}: {
  children: React.ReactNode;
  displayName: string;
  roleName: string;
  permissions: NavigationPermissions;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem(SIDEBAR_PREFERENCE_KEY) === "true");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setDrawerOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_PREFERENCE_KEY, String(next));
      return next;
    });
  }

  function changeDrawerOpen(open: boolean) {
    setDrawerOpen(open);
    if (!open) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function beginSwipe(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = Math.abs(event.clientY - start.y);
    if (horizontalDistance < -64 && verticalDistance < 80)
      changeDrawerOpen(false);
  }

  return (
    <div
      className={cn(
        "admin-app min-h-screen bg-slate-100 text-slate-950",
        collapsed ? "admin-sidebar-collapsed" : "admin-sidebar-expanded",
      )}
    >
      <aside
        className={cn(
          "admin-desktop-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#071525] py-6 lg:flex",
          collapsed ? "w-20 px-3" : "w-72 px-5",
        )}
      >
        <Brand compact={collapsed} />
        <div className="mt-9 min-h-0 flex-1 overflow-y-auto overflow-x-visible pb-4">
          <Navigation
            id="admin-desktop-navigation"
            permissions={permissions}
            collapsed={collapsed}
          />
        </div>
        <SessionProtection collapsed={collapsed} />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={
            collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"
          }
          aria-expanded={!collapsed}
          aria-controls="admin-desktop-navigation"
          className="admin-sidebar-toggle absolute top-20 -right-5 grid size-10 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md outline-none transition-[color,background-color,transform,box-shadow] duration-200 hover:scale-105 hover:bg-amber-50 hover:text-[#0b2341] focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:scale-95"
        >
          {collapsed ? (
            <ChevronRight className="size-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="size-4" aria-hidden="true" />
          )}
        </button>
      </aside>

      <div className="admin-content-shell min-w-0">
        <header className="admin-topbar sticky top-0 z-20 border-b border-slate-200/90 bg-white/92 px-4 py-3 shadow-[0_1px_12px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => changeDrawerOpen(!drawerOpen)}
              aria-label={drawerOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={drawerOpen}
              aria-controls="admin-mobile-navigation"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm outline-none transition-[background-color,border-color,color,transform] duration-200 hover:border-amber-300 hover:bg-amber-50 hover:text-[#0b2341] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-95 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 lg:flex-none">
              <p
                className="truncate text-sm font-semibold text-slate-900"
                title={displayName}
              >
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">Rol: {roleName}</p>
            </div>
            <form action={logout} className="shrink-0">
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="admin-button-secondary inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-[background-color,border-color,color,transform,box-shadow] duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:translate-y-px sm:px-4"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-9 xl:px-10 xl:py-10">
          {children}
        </main>
      </div>

      <Sheet open={drawerOpen} onOpenChange={changeDrawerOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          id="admin-mobile-navigation"
          aria-describedby={undefined}
          className="w-[min(22rem,calc(100vw-2rem))] gap-0 border-r-0 bg-[#071525] p-0 text-white shadow-2xl sm:max-w-sm lg:hidden"
          onPointerDown={beginSwipe}
          onPointerUp={finishSwipe}
          style={{ touchAction: "pan-y" }}
        >
          <SheetTitle className="sr-only">Navegación administrativa</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-4">
              <Brand />
              <button
                type="button"
                onClick={() => changeDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/15 text-slate-200 outline-none transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300 active:bg-white/15"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5">
              <Navigation
                permissions={permissions}
                onNavigate={() => changeDrawerOpen(false)}
              />
              <Link
                href="/"
                onClick={() => changeDrawerOpen(false)}
                className="mt-3 flex min-h-12 items-center gap-3 rounded-xl px-4 font-medium text-slate-300 outline-none transition-colors duration-200 hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <BookOpenText
                  className="size-5 text-amber-300/75"
                  aria-hidden="true"
                />
                Sitio público
              </Link>
            </div>
            <SessionProtection />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
