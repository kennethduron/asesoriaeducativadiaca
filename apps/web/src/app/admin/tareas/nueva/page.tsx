import Link from "next/link";

import { TaskForm } from "@/components/admin/task-form";
import { requirePermission } from "@/lib/auth/authorization";
import { getTaskFormOptions } from "@/lib/tasks/queries";

export default async function NewTaskPage() {
  const principal = await requirePermission("tasks.create");
  const options = await getTaskFormOptions();
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/tareas"
        className="inline-flex min-h-11 items-center font-semibold text-slate-600"
      >
        ← Volver a tareas
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Nueva tarea</h1>
      <p className="mt-2 text-slate-600">
        La fecha y la hora se interpretan en America/Tegucigalpa y se almacenan
        con zona horaria.
      </p>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <TaskForm options={options} currentUserId={principal.id} />
      </section>
    </div>
  );
}
