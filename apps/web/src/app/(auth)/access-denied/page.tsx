import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export const metadata: Metadata = {
  title: "Acceso denegado",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.1)] sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800">
          <LockKeyhole className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-amber-700 uppercase">
          403
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Acceso denegado
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Tu cuenta no tiene acceso a este recurso o no se encuentra activa.
          Contacta al propietario si consideras que es un error.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[#0b2341] px-5 font-semibold text-white transition hover:bg-[#12345e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          Volver al sitio público
        </Link>
      </div>
    </main>
  );
}
