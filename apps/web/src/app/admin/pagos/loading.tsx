export default function PaymentsLoading() {
  return (
    <div role="status" aria-label="Cargando pagos" className="space-y-4">
      <div className="h-10 w-52 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-28 animate-pulse rounded-2xl bg-white" />
      <div className="h-72 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
