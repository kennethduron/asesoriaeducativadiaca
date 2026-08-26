import Link from "next/link";
import { BellRing, Plus, Search } from "lucide-react";

import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { listTasks } from "@/lib/tasks/queries";
import { taskListSchema } from "@/lib/tasks/validation";
import { TaskNotifications } from "@/components/admin/task-notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const priorityLabels = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
} as const;
const statusLabels = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
} as const;
const scopes = [
  ["mine", "Mis tareas"],
  ["today", "Hoy"],
  ["upcoming", "Próximas"],
  ["overdue", "Vencidas"],
  ["completed", "Completadas"],
  ["all", "Todas"],
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("tasks.read");
  const query = await searchParams;
  const raw = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      typeof value === "string" ? value : undefined,
    ]),
  );
  let parsed = taskListSchema.safeParse(raw);
  if (!parsed.success) parsed = taskListSchema.safeParse({});
  const filters = parsed.data!;
  if (filters.scope === "all" && !hasPermission(principal, "tasks.manage"))
    filters.scope = "mine";
  const tasks = await listTasks(filters);
  const total = Number(tasks[0]?.total_count ?? 0);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
            Seguimiento administrativo
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Tareas</h1>
          <p className="mt-2 text-slate-600">
            Agenda en zona horaria de Honduras, con responsables y recordatorios
            auditables.
          </p>
        </div>
        {hasPermission(principal, "tasks.create") ? (
          <Link
            href="/admin/tareas/nueva"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
          >
            <Plus className="size-4" /> Nueva tarea
          </Link>
        ) : null}
      </div>
      <div className="mt-4">
        <TaskNotifications />
      </div>
      <nav
        aria-label="Vistas de tareas"
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
      >
        {scopes
          .filter(
            ([scope]) =>
              scope !== "all" || hasPermission(principal, "tasks.manage"),
          )
          .map(([scope, label]) => (
            <Link
              key={scope}
              href={`/admin/tareas?scope=${scope}`}
              aria-current={filters.scope === scope ? "page" : undefined}
              className={`inline-flex min-h-11 min-w-max items-center rounded-xl px-4 font-semibold ${filters.scope === scope ? "bg-[#0b2341] text-white" : "border border-slate-200 bg-white text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
      </nav>
      <form className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px_auto]">
        <input type="hidden" name="scope" value={filters.scope} />
        <label className="relative">
          <span className="sr-only">Buscar tareas</span>
          <Search className="absolute top-3 left-3 size-5 text-slate-400" />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Título o cliente"
            className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-10"
          />
        </label>
        <select
          aria-label="Filtrar por estado"
          name="status"
          defaultValue={filters.status ?? ""}
          className="h-11 rounded-xl border border-slate-300 bg-white px-3"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="min-h-11 rounded-xl bg-slate-800 px-5 font-semibold text-white">
          Filtrar
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">{total} tareas</p>
      {tasks.length ? (
        <div className="mt-4 grid gap-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/admin/tareas/${task.id}`}
              className="grid min-h-20 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto] sm:items-center"
            >
              <span>
                <span className="flex items-center gap-2">
                  <strong>{task.title}</strong>
                  {task.reminder_count ? (
                    <BellRing
                      className="size-4 text-amber-600"
                      aria-label={`${task.reminder_count} recordatorios`}
                    />
                  ) : null}
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  {task.client_name ?? "Sin cliente"} · {task.assigned_name}
                </span>
              </span>
              <span className="text-sm">
                <span
                  className={`rounded-full px-2.5 py-1 font-semibold ${task.is_overdue ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}`}
                >
                  {task.is_overdue ? "Vencida" : statusLabels[task.status]}
                </span>
                <span className="mt-2 block text-slate-500">
                  {new Intl.DateTimeFormat("es-HN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/Tegucigalpa",
                  }).format(new Date(task.due_at))}
                </span>
              </span>
              <span className="text-sm font-semibold text-[#17365d]">
                {priorityLabels[task.priority]}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No hay tareas para esta vista.
        </p>
      )}
    </div>
  );
}
