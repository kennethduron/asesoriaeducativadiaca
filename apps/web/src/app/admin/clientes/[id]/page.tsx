import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import {
  ClientServiceForm,
  NoteForm,
} from "@/components/admin/client-profile-forms";
import { ClientStatementView } from "@/components/admin/client-statement";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { setClientStatusAction } from "@/lib/crm/actions";
import { hasPermission, requirePermission } from "@/lib/auth/authorization";
import {
  getClient,
  getClientActivity,
  getClientNotes,
  getClientServices,
  listServiceCatalog,
} from "@/lib/crm/queries";
import { formatMoney } from "@/lib/financial/money";
import { getClientCharges, getClientPayments } from "@/lib/financial/queries";
import {
  getClientStatement,
  listClientStatementCurrencies,
} from "@/lib/statements/queries";
import { resolveStatementFilters } from "@/lib/statements/validation";
import { listClientTasks } from "@/lib/tasks/queries";

const baseTabs = [
  ["summary", "Resumen"],
  ["services", "Servicios"],
  ["notes", "Notas"],
  ["activity", "Actividad"],
] as const;

const activityLabels: Record<string, string> = {
  "client.created": "Cliente creado",
  "client.updated": "Cliente actualizado",
  "client.status_changed": "Estado del cliente cambiado",
  "client.note.created": "Nota agregada",
  "client.note.updated": "Nota corregida",
  "client_service.created": "Servicio agregado",
  "client_service.updated": "Servicio actualizado",
  "client_service.status_changed": "Estado del servicio cambiado",
};

const serviceStatus: Record<string, string> = {
  pending: "Pendiente",
  active: "Activo",
  suspended: "Suspendido",
  completed: "Completado",
  cancelled: "Cancelado",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(
    new Date(value.length === 10 ? `${value}T12:00:00` : value),
  );

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requirePermission("clients.read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const client = await getClient(id);
  if (!client) notFound();
  const query = await searchParams;
  const canReadCharges = hasPermission(principal, "charges.read");
  const canReadPayments = hasPermission(principal, "payments.read");
  const canReadStatement = canReadCharges && canReadPayments;
  const canReadTasks = hasPermission(principal, "tasks.read");
  const tabs: ReadonlyArray<readonly [string, string]> = [
    ...baseTabs,
    ...(canReadCharges ? [["charges", "Cargos"] as const] : []),
    ...(canReadPayments ? [["payments", "Pagos"] as const] : []),
    ...(canReadTasks ? [["tasks", "Tareas"] as const] : []),
    ...(canReadStatement
      ? [["estado-cuenta", "Estado de cuenta"] as const]
      : []),
  ];
  const requestedTab = typeof query.tab === "string" ? query.tab : "summary";
  if (requestedTab === "estado-cuenta" && !canReadStatement)
    redirect("/access-denied");
  const tab = tabs.some(([key]) => key === requestedTab)
    ? requestedTab
    : "summary";
  const success = typeof query.success === "string" ? query.success : undefined;
  const canWriteClients = hasPermission(principal, "clients.write");
  const canWriteServices = hasPermission(principal, "services.write");
  const services =
    tab === "summary" || tab === "services" ? await getClientServices(id) : [];
  const notes = tab === "notes" ? await getClientNotes(id) : [];
  const activity = tab === "activity" ? await getClientActivity(id) : [];
  const tasks =
    tab === "tasks"
      ? await listClientTasks(id, hasPermission(principal, "tasks.manage"))
      : [];
  const catalog =
    tab === "services" && canWriteServices
      ? await listServiceCatalog(true)
      : [];
  const financial = {
    charges: tab === "charges" ? await getClientCharges(id) : [],
    payments: tab === "payments" ? await getClientPayments(id) : [],
  };
  const statementCurrencies =
    tab === "estado-cuenta" ? await listClientStatementCurrencies(id) : [];
  const statementFilters = resolveStatementFilters(
    query,
    statementCurrencies[0] ?? "HNL",
  );
  const statement =
    tab === "estado-cuenta" && statementFilters.success
      ? await getClientStatement(id, statementFilters.data)
      : null;
  const successText: Record<string, string> = {
    created: "Cliente registrado correctamente.",
    updated: "Cliente actualizado correctamente.",
    note: "Nota agregada correctamente.",
    service: "Servicio agregado correctamente.",
  };

  return (
    <div>
      {success && successText[success] ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900"
        >
          {successText[success]}
        </div>
      ) : null}
      <Link
        href="/admin/clientes"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        ← Volver a clientes
      </Link>
      <header className="mt-5 rounded-2xl bg-[#0b2341] p-5 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-sm text-amber-300">
              {client.client_code}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {client.full_name}
            </h1>
            <span
              className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${client.status === "active" ? "bg-emerald-300 text-emerald-950" : "bg-slate-200 text-slate-800"}`}
            >
              {client.status === "active" ? "Activo" : "Inactivo"}
            </span>
          </div>
          {canWriteClients ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/clientes/${id}/editar`}
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-semibold text-[#0b2341]"
              >
                Editar
              </Link>
              <ConfirmSubmit
                action={setClientStatusAction}
                hidden={{
                  client_id: id,
                  status: client.status === "active" ? "inactive" : "active",
                }}
                message={
                  client.status === "active"
                    ? "¿Inactivar este cliente?"
                    : "¿Reactivar este cliente?"
                }
                triggerClassName="min-h-11 rounded-xl border border-white/30 px-4 font-semibold"
              >
                {client.status === "active" ? "Inactivar" : "Reactivar"}
              </ConfirmSubmit>
            </div>
          ) : null}
        </div>
        <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {client.email ? (
            <span className="flex items-center gap-2">
              <Mail className="size-4" />
              {client.email}
            </span>
          ) : null}
          {client.phone ? (
            <span className="flex items-center gap-2">
              <Phone className="size-4" />
              {client.phone}
            </span>
          ) : null}
          {client.whatsapp ? (
            <span className="flex items-center gap-2">
              <MessageCircle className="size-4" />
              {client.whatsapp}
            </span>
          ) : null}
          {client.city || client.country ? (
            <span className="flex items-center gap-2">
              <MapPin className="size-4" />
              {[client.city, client.country].filter(Boolean).join(", ")}
            </span>
          ) : null}
        </div>
      </header>

      <nav aria-label="Secciones del perfil" className="mt-6 overflow-x-auto">
        <div
          role="tablist"
          className="flex min-w-max gap-1 rounded-xl border border-slate-200 bg-white p-1"
        >
          {tabs.map(([key, label]) => (
            <Link
              key={key}
              role="tab"
              aria-selected={tab === key}
              href={`/admin/clientes/${id}?tab=${key}`}
              className={`min-h-11 rounded-lg px-4 py-3 text-sm font-semibold ${tab === key ? "bg-[#0b2341] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <section role="tabpanel" className="mt-6">
        {tab === "summary" ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h2 className="text-xl font-semibold">Información general</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-slate-500">Tipo</dt>
                  <dd className="mt-1 font-medium">
                    {client.client_type === "business" ? "Empresa" : "Persona"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Registro</dt>
                  <dd className="mt-1 font-medium">
                    {date(client.registered_on)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Dirección</dt>
                  <dd className="mt-1 font-medium">
                    {client.address || "No registrada"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">
                    Última actualización
                  </dt>
                  <dd className="mt-1 font-medium">
                    {date(client.updated_at)}
                  </dd>
                </div>
              </dl>
              {client.notes_summary ? (
                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold">Resumen interno</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {client.notes_summary}
                  </p>
                </div>
              ) : null}
            </article>
            <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">Servicios registrados</p>
                <p className="mt-2 text-3xl font-semibold">{services.length}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-sm text-emerald-800">Servicios activos</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-950">
                  {services.filter((item) => item.status === "active").length}
                </p>
              </div>
            </aside>
          </div>
        ) : null}

        {tab === "services" ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Servicios contratados</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Máximo 50 registros recientes.
                </p>
              </div>
            </div>
            {canWriteServices ? (
              <ClientServiceForm clientId={id} services={catalog} />
            ) : null}
            {services.length ? (
              <div className="grid gap-3">
                {services.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-wide text-amber-700 uppercase">
                          {item.service_catalog?.service_categories?.name}
                        </p>
                        <h3 className="mt-1 font-semibold">
                          {item.service_catalog?.name}
                        </h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                        {serviceStatus[item.status] ?? item.status}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-slate-500">Inicio / fin</dt>
                        <dd>
                          {date(item.start_date)}
                          {item.end_date ? ` – ${date(item.end_date)}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Precio acordado</dt>
                        <dd>
                          {item.agreed_price
                            ? `${new Intl.NumberFormat("es-HN", { minimumFractionDigits: 2 }).format(Number(item.agreed_price))} ${item.currency_code}`
                            : "Por definir"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Modalidad</dt>
                        <dd>{item.billing_mode || "Sin definir"}</dd>
                      </div>
                    </dl>
                    {item.custom_description ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">
                        {item.custom_description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                Este cliente todavía no tiene servicios registrados.
              </p>
            )}
          </div>
        ) : null}

        {tab === "notes" ? (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">Notas internas</h2>
            {canWriteClients ? <NoteForm clientId={id} /> : null}
            {notes.length ? (
              <ol className="space-y-3">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <p className="whitespace-pre-wrap leading-7 text-slate-800">
                      {note.note}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {note.author_name} · {date(note.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                Todavía no hay notas.
              </p>
            )}
          </div>
        ) : null}

        {tab === "activity" ? (
          <div>
            <h2 className="text-xl font-semibold">Actividad reciente</h2>
            <p className="mt-1 text-sm text-slate-600">
              Eventos auditados relacionados con este cliente.
            </p>
            {activity.length ? (
              <ol className="mt-5 border-l-2 border-slate-200 pl-5">
                {activity.map((event) => (
                  <li
                    key={event.id}
                    className="relative pb-6 before:absolute before:top-1 before:-left-[1.7rem] before:size-3 before:rounded-full before:bg-amber-500"
                  >
                    <p className="font-semibold">
                      {activityLabels[event.action] ?? "Actividad registrada"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.actor_name} · {date(event.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                No hay actividad visible.
              </p>
            )}
          </div>
        ) : null}

        {tab === "charges" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Cargos del cliente</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Saldos derivados de cargos menos asignaciones activas.
                </p>
              </div>
              {hasPermission(principal, "charges.write") ? (
                <Link
                  href={`/admin/cargos/nuevo?client=${id}`}
                  className="inline-flex min-h-11 items-center rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
                >
                  Nuevo cargo
                </Link>
              ) : null}
            </div>
            {financial.charges.length ? (
              <div className="mt-5 grid gap-3">
                {financial.charges.map((charge) => (
                  <Link
                    key={charge.charge_id}
                    href={`/admin/cargos/${charge.charge_id}`}
                    className="grid min-h-20 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <span>
                      <strong className="block">{charge.concept}</strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {charge.charge_date} · {charge.derived_status}
                      </span>
                    </span>
                    <span className="text-sm">
                      Saldo:{" "}
                      {formatMoney(
                        charge.remaining_amount ?? 0,
                        charge.currency_code ?? "HNL",
                      )}
                    </span>
                    <span className="font-semibold text-[#17365d]">Ver</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                Este cliente no tiene cargos registrados.
              </p>
            )}
          </div>
        ) : null}

        {tab === "payments" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Pagos del cliente</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pagos recientes y sus recibos emitidos.
                </p>
              </div>
              {hasPermission(principal, "payments.create") &&
              hasPermission(principal, "payments.confirm") ? (
                <Link
                  href={`/admin/pagos/nuevo?client=${id}`}
                  className="inline-flex min-h-11 items-center rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
                >
                  Registrar pago
                </Link>
              ) : null}
            </div>
            {financial.payments.length ? (
              <div className="mt-5 grid gap-3">
                {financial.payments.map((payment) => {
                  const receipt = Array.isArray(payment.receipts)
                    ? payment.receipts[0]
                    : payment.receipts;
                  return (
                    <Link
                      key={payment.id}
                      href={`/admin/pagos/${payment.id}`}
                      className="grid min-h-20 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                    >
                      <span>
                        <strong className="block font-mono text-sm">
                          {receipt?.receipt_number ?? "Sin recibo"}
                        </strong>
                        <span className="mt-1 block text-sm text-slate-500">
                          {payment.payment_date} · {payment.status}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {formatMoney(payment.amount, payment.currency_code)}
                      </span>
                      <span className="font-semibold text-[#17365d]">Ver</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                Este cliente no tiene pagos registrados.
              </p>
            )}
          </div>
        ) : null}

        {tab === "estado-cuenta" ? (
          statement ? (
            <ClientStatementView
              statement={statement}
              currencies={statementCurrencies}
              profilePath={`/admin/clientes/${id}`}
            />
          ) : (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"
            >
              <h2 className="font-semibold">Revisa el período solicitado</h2>
              <p className="mt-1 text-sm">
                La fecha inicial, la fecha final o la moneda no son válidas.
              </p>
            </div>
          )
        ) : null}
        {tab === "tasks" ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Tareas del cliente</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Seguimientos visibles según su rol y asignación.
                </p>
              </div>
              {hasPermission(principal, "tasks.create") ? (
                <Link
                  href="/admin/tareas/nueva"
                  className="inline-flex min-h-11 items-center rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
                >
                  Crear seguimiento
                </Link>
              ) : null}
            </div>
            {tasks.length ? (
              <div className="mt-5 grid gap-3">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/admin/tareas/${task.id}`}
                    className="grid min-h-20 gap-2 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span>
                      <strong className="block">{task.title}</strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {task.assigned_name} · {task.status}
                      </span>
                    </span>
                    <time className="text-sm text-slate-600">
                      {new Intl.DateTimeFormat("es-HN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "America/Tegucigalpa",
                      }).format(new Date(task.due_at))}
                    </time>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
                No hay tareas visibles para este cliente.
              </p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
