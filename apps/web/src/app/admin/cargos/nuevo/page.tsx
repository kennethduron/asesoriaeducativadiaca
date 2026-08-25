import Link from "next/link";

import { ChargeForm } from "@/components/admin/charge-form";
import { requirePermission } from "@/lib/auth/authorization";
import { getClient } from "@/lib/crm/queries";
import {
  getClientServicesForCharge,
  listFinancialClients,
} from "@/lib/financial/queries";

export default async function NewChargePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("charges.write");
  const query = await searchParams;
  const selectedId =
    typeof query.client === "string" && /^[0-9a-f-]{36}$/i.test(query.client)
      ? query.client
      : undefined;
  const q = typeof query.q === "string" ? query.q.slice(0, 120) : "";
  const [clients, selectedClient, services] = await Promise.all([
    listFinancialClients(q),
    selectedId ? getClient(selectedId) : Promise.resolve(null),
    selectedId ? getClientServicesForCharge(selectedId) : Promise.resolve([]),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/cargos"
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver a cargos
      </Link>
      <h1 className="mt-5 text-3xl font-semibold">Registrar cargo</h1>
      <p className="mt-2 text-slate-600">
        Un servicio contratado no genera deuda hasta registrar este cargo
        explícitamente.
      </p>
      {!selectedClient ? (
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">1. Selecciona el cliente</h2>
          <form role="search" className="mt-4 flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Nombre, código o teléfono"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3"
            />
            <button className="min-h-11 rounded-xl bg-[#0b2341] px-4 font-semibold text-white">
              Buscar
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/cargos/nuevo?client=${client.id}`}
                className="flex min-h-14 items-center justify-between rounded-xl border border-slate-200 px-4 hover:bg-slate-50"
              >
                <span>
                  <strong className="block">{client.full_name}</strong>
                  <span className="font-mono text-xs text-slate-500">
                    {client.client_code}
                  </span>
                </span>
                <span className="font-semibold text-[#17365d]">
                  Seleccionar
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="mt-7 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase">
                Cliente seleccionado
              </p>
              <p className="mt-1 font-semibold text-emerald-950">
                {selectedClient.full_name}
              </p>
            </div>
            <Link
              href="/admin/cargos/nuevo"
              className="inline-flex min-h-11 items-center text-sm font-semibold"
            >
              Cambiar
            </Link>
          </div>
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <ChargeForm clientId={selectedClient.id} services={services} />
          </section>
        </>
      )}
    </div>
  );
}
