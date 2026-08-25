import Link from "next/link";

import { CategoryForm, ServiceForm } from "@/components/admin/service-forms";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import {
  toggleCategoryStatusAction,
  toggleServiceStatusAction,
} from "@/lib/crm/actions";
import { listServiceCatalog, listServiceCategories } from "@/lib/crm/queries";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("services.read");
  const [categories, services, query] = await Promise.all([
    listServiceCategories(),
    listServiceCatalog(),
    searchParams,
  ]);
  const canWrite = hasPermission(principal, "services.write");
  const success = typeof query.success === "string" ? query.success : undefined;
  const message: Record<string, string> = {
    category: "Categoría creada correctamente.",
    service: "Servicio creado correctamente.",
    updated: "Servicio actualizado correctamente.",
  };
  const money = (value: number | null, currency: string) =>
    value == null
      ? "Por definir"
      : `${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2 }).format(Number(value))} ${currency}`;

  return (
    <div>
      {success && message[success] ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900"
        >
          {message[success]}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold tracking-[0.14em] text-amber-700 uppercase">
          Operación
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Catálogo de servicios</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Servicios disponibles para asignar a clientes. Los precios son
          referencias y no generan cargos.
        </p>
      </div>

      {canWrite ? (
        <details className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer font-semibold">
            Crear servicio o categoría
          </summary>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <ServiceForm
              categories={categories.filter((item) => item.is_active)}
            />
            <CategoryForm />
          </div>
        </details>
      ) : null}

      <section className="mt-8" aria-labelledby="catalog-title">
        <div className="flex items-center justify-between">
          <h2 id="catalog-title" className="text-xl font-semibold">
            Servicios
          </h2>
          <span className="text-sm text-slate-500">
            {services.length} registros
          </span>
        </div>
        {services.length ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.6fr_1fr] gap-3 bg-slate-50 px-5 py-3 text-xs font-semibold tracking-wide text-slate-600 uppercase lg:grid">
              <span>Servicio</span>
              <span>Categoría</span>
              <span>Precio</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {services.map((service) => (
              <article
                key={service.id}
                className="grid gap-3 border-t border-slate-100 p-5 first:border-t-0 lg:grid-cols-[1.4fr_1fr_0.8fr_0.6fr_1fr] lg:items-center"
              >
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  {service.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {service.description}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm">{service.service_categories?.name}</p>
                <p className="text-sm font-medium">
                  {money(service.standard_price, service.currency_code)}
                </p>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${service.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                >
                  {service.is_active ? "Activo" : "Inactivo"}
                </span>
                {canWrite ? (
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/servicios/${service.id}/editar`}
                      className="inline-flex min-h-11 items-center text-sm font-semibold text-[#17365d]"
                    >
                      Editar
                    </Link>
                    <ConfirmSubmit
                      action={toggleServiceStatusAction}
                      hidden={{
                        service_id: service.id,
                        is_active: String(!service.is_active),
                      }}
                      message={
                        service.is_active
                          ? "¿Inactivar este servicio?"
                          : "¿Activar este servicio?"
                      }
                      triggerClassName="min-h-11 text-sm font-semibold text-slate-600"
                    >
                      {service.is_active ? "Inactivar" : "Activar"}
                    </ConfirmSubmit>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Solo lectura</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-8 text-center">
            No hay servicios registrados.
          </p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="categories-title">
        <h2 id="categories-title" className="text-xl font-semibold">
          Categorías
        </h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article
              key={category.id}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">
                    {category.code}
                  </p>
                  <h3 className="mt-1 font-semibold">{category.name}</h3>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${category.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                >
                  {category.is_active ? "Activa" : "Inactiva"}
                </span>
              </div>
              {category.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {category.description}
                </p>
              ) : null}
              {canWrite ? (
                <div className="mt-3">
                  <ConfirmSubmit
                    action={toggleCategoryStatusAction}
                    hidden={{
                      category_id: category.id,
                      is_active: String(!category.is_active),
                    }}
                    message={
                      category.is_active
                        ? "¿Inactivar esta categoría? Los servicios existentes se conservarán."
                        : "¿Activar esta categoría?"
                    }
                    triggerClassName="min-h-11 text-sm font-semibold text-[#17365d]"
                  >
                    {category.is_active ? "Inactivar" : "Activar"}
                  </ConfirmSubmit>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
