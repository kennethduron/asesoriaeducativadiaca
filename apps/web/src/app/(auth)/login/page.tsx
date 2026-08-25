import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { toSafeInternalPath } from "@/lib/auth/safe-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Acceso administrativo",
  description: "Acceso seguro al panel administrativo de DIACA.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = toSafeInternalPath(params.next, "/admin");
  const configured = isSupabaseConfigured();

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(440px,620px)]">
      <section className="relative hidden overflow-hidden bg-[#071525] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(217,173,79,0.22),transparent_35%),radial-gradient(circle_at_80%_85%,rgba(30,74,124,0.5),transparent_40%)]" />
        <div className="relative flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-amber-300 uppercase">
          <span className="grid size-11 place-items-center rounded-xl border border-amber-300/40 bg-white/5">
            D
          </span>
          Asesoría Educativa DIACA
        </div>
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold tracking-[0.2em] text-amber-300 uppercase">
            Administración segura
          </p>
          <h1 className="mt-5 text-5xl leading-tight font-semibold tracking-tight">
            Un espacio privado para gestionar el futuro de DIACA.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Autenticación moderna, permisos por rol y protección de datos desde
            la base de datos.
          </p>
        </div>
        <p className="relative text-sm text-slate-400">
          Entorno administrativo aislado · Honduras
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-3 font-semibold text-[#0b2341] lg:hidden"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#0b2341] text-amber-300">
              D
            </span>
            DIACA
          </Link>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
            Bienvenido de nuevo
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            Ingresa con el correo y la contraseña de tu cuenta autorizada.
          </p>
          {!configured || params.error === "configuration" ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              El acceso aún no está configurado en este entorno.
            </p>
          ) : (
            <LoginForm nextPath={nextPath} />
          )}
          <p className="mt-8 text-center text-sm text-slate-500">
            No existe registro público. Solicita acceso al propietario de DIACA.
          </p>
        </div>
      </section>
    </main>
  );
}
