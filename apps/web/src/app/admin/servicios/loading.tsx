export default function ServicesLoading() {
  return (
    <div aria-label="Cargando servicios" aria-busy="true">
      <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-2xl bg-slate-200"
          />
        ))}
      </div>
    </div>
  );
}
