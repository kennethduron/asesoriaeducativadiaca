import Link from "next/link";

export default function ClientNotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <h1 className="text-2xl font-semibold">Cliente no disponible</h1>
      <p className="mt-2 text-slate-600">
        No encontramos un registro accesible con ese identificador.
      </p>
      <Link
        href="/admin/clientes"
        className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0b2341] px-4 font-semibold text-white"
      >
        Volver a clientes
      </Link>
    </div>
  );
}
