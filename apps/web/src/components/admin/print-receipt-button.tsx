"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hidden inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-semibold"
    >
      <Printer className="size-4" aria-hidden="true" /> Imprimir recibo
    </button>
  );
}
