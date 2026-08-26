import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskForm } from "@/components/admin/task-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import { setTaskStatusAction } from "@/lib/tasks/actions";
import {
  getTask,
  getTaskFormOptions,
  getTaskReminders,
} from "@/lib/tasks/queries";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completada",
  cancelled: "Cancelada",
};
export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("tasks.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [task, reminders, options] = await Promise.all([
    getTask(id),
    getTaskReminders(id),
    getTaskFormOptions(),
  ]);
  if (!task) notFound();
  const query = await searchParams;
  const closed = task.status === "completed" || task.status === "cancelled";
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/tareas"
        className="inline-flex min-h-11 items-center font-semibold text-slate-600"
      >
        ← Volver a tareas
      </Link>
      {query.success ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900"
        >
          Tarea guardada correctamente.
        </div>
      ) : null}
      <header className="mt-4 rounded-2xl bg-[#0b2341] p-5 text-white sm:p-7">
        <p className="text-sm font-semibold text-amber-300">
          {statusLabels[task.status]}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{task.title}</h1>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Responsable</dt>
            <dd>{task.assigned_name}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Vencimiento</dt>
            <dd>
              {new Intl.DateTimeFormat("es-HN", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Tegucigalpa",
              }).format(new Date(task.due_at))}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Cliente</dt>
            <dd>{task.client_name ?? "Sin cliente"}</dd>
          </div>
        </dl>
      </header>
      {hasPermission(principal, "tasks.complete") ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {task.status !== "completed" ? (
            <ConfirmSubmit
              action={setTaskStatusAction}
              hidden={{ task_id: id, status: "completed" }}
              message="¿Marcar esta tarea como completada?"
              triggerClassName="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white"
            >
              Completar
            </ConfirmSubmit>
          ) : (
            <ConfirmSubmit
              action={setTaskStatusAction}
              hidden={{ task_id: id, status: "pending" }}
              message="¿Reabrir esta tarea?"
              triggerClassName="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-semibold"
            >
              Reabrir
            </ConfirmSubmit>
          )}
          {task.status !== "cancelled" ? (
            <ConfirmSubmit
              action={setTaskStatusAction}
              hidden={{ task_id: id, status: "cancelled" }}
              message="¿Cancelar esta tarea y sus recordatorios pendientes?"
              triggerClassName="min-h-11 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700"
            >
              Cancelar
            </ConfirmSubmit>
          ) : null}
        </div>
      ) : null}
      {reminders.length ? (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Recordatorios</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="rounded-xl bg-slate-50 p-3">
                {new Intl.DateTimeFormat("es-HN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Tegucigalpa",
                }).format(new Date(reminder.remind_at))}{" "}
                ·{" "}
                {[
                  reminder.channel_push ? "Push" : null,
                  reminder.channel_email ? "Email" : null,
                ]
                  .filter(Boolean)
                  .join(" + ")}{" "}
                · {reminder.status}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!closed && hasPermission(principal, "tasks.update") ? (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="mb-5 text-xl font-semibold">Editar tarea</h2>
          <TaskForm
            options={options}
            currentUserId={principal.id}
            initial={task}
          />
        </section>
      ) : null}
    </div>
  );
}
