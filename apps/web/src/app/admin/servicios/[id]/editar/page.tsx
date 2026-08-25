import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceForm } from "@/components/admin/service-forms";
import { requirePermission } from "@/lib/auth/authorization";
import { updateServiceAction } from "@/lib/crm/actions";
import { getCatalogService, listServiceCategories } from "@/lib/crm/queries";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("services.write");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [service, categories] = await Promise.all([
    getCatalogService(id),
    listServiceCategories(),
  ]);
  if (!service) notFound();
  const action = updateServiceAction.bind(null, id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/servicios"
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver al catálogo
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Editar servicio</h1>
      <p className="mt-2 text-slate-600">
        Los cambios se registran en auditoría y no alteran servicios contratados
        anteriores.
      </p>
      <div className="mt-7">
        <ServiceForm
          categories={categories}
          value={service}
          action={action}
          label="Guardar servicio"
        />
      </div>
    </div>
  );
}
