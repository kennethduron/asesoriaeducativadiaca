import { randomUUID } from "node:crypto";
import Link from "next/link";

import { PaymentForm } from "@/components/admin/payment-form";
import { requirePermission } from "@/lib/auth/authorization";
import { getClient } from "@/lib/crm/queries";
import {
  getOpenCharges,
  listFinancialClients,
  listPaymentMethods,
} from "@/lib/financial/queries";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("payments.create");
  await requirePermission("payments.confirm");
  const query = await searchParams;
  const selectedId =
    typeof query.client === "string" && /^[0-9a-f-]{36}$/i.test(query.client)
      ? query.client
      : undefined;
  const q = typeof query.q === "string" ? query.q.slice(0, 120) : "";
  const [clients, selectedClient, charges, methods] = await Promise.all([
    listFinancialClients(q),
    selectedId ? getClient(selectedId) : Promise.resolve(null),
    selectedId ? getOpenCharges(selectedId) : Promise.resolve([]),
    selectedId ? listPaymentMethods() : Promise.resolve([]),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/pagos"
        className="text-sm font-semibold text-slate-600"
      >
        ← Volver a pagos
      </Link>
      <h1 className="mt-5 text-3xl font-semibold">Registrar pago</h1>
      <p className="mt-2 text-slate-600">
        La confirmación es transaccional y emitirá un recibo inmutable.
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
                href={`/admin/pagos/nuevo?client=${client.id}`}
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
        <div className="mt-7">
          <div className="mb-5 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p>
              <span className="block text-xs font-semibold text-emerald-700 uppercase">
                Cliente seleccionado
              </span>
              <strong className="mt-1 block text-emerald-950">
                {selectedClient.full_name}
              </strong>
            </p>
            <Link
              href="/admin/pagos/nuevo"
              className="inline-flex min-h-11 items-center text-sm font-semibold"
            >
              Cambiar
            </Link>
          </div>
          <PaymentForm
            client={{
              id: selectedClient.id,
              client_code: selectedClient.client_code,
              full_name: selectedClient.full_name,
            }}
            charges={charges}
            methods={methods}
            idempotencyKey={randomUUID()}
          />
        </div>
      )}
    </div>
  );
}
