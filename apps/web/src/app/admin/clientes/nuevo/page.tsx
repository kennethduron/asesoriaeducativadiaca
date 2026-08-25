import Link from "next/link";

import { ClientForm } from "@/components/admin/client-form";
import { createClientAction } from "@/lib/crm/actions";
import { requirePermission } from "@/lib/auth/authorization";

export default async function NewClientPage() {
  await requirePermission("clients.write");
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/clientes"
        className="text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Volver a clientes
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Nuevo cliente</h1>
      <p className="mt-2 text-slate-600">
        Registra únicamente los datos necesarios para la atención actual.
      </p>
      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-7">
        <ClientForm
          action={createClientAction}
          submitLabel="Registrar cliente"
        />
      </div>
    </div>
  );
}
