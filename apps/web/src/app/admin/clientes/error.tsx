"use client";

export default function ClientsError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6"
    >
      <h1 className="text-xl font-semibold text-red-950">
        No pudimos cargar los clientes.
      </h1>
      <p className="mt-2 text-sm text-red-800">
        Intenta nuevamente. Si el problema continúa, comunícate con
        administración.
      </p>
      <button
        onClick={reset}
        className="mt-5 min-h-11 rounded-xl bg-red-900 px-4 font-semibold text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
