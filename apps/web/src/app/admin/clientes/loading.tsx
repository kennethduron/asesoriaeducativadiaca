export default function ClientsLoading() {
  return (
    <div role="status" aria-label="Cargando clientes" aria-busy="true">
      <div className="h-9 w-52 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-7 h-20 animate-pulse rounded-2xl bg-slate-200" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}
