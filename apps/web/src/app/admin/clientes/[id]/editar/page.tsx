import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientForm } from "@/components/admin/client-form";
import { requirePermission } from "@/lib/auth/authorization";
import { updateClientAction } from "@/lib/crm/actions";
import { getClient } from "@/lib/crm/queries";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("clients.write");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = await getClient(id);
  if (!client) notFound();
  const action = updateClientAction.bind(null, id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/admin/clientes/${id}`}
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver al perfil
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Editar cliente</h1>
      <p className="mt-2 text-slate-600">
        La actualización será registrada en auditoría.
      </p>
      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
        <ClientForm
          action={action}
          value={client}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
