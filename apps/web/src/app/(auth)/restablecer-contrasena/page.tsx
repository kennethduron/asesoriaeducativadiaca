import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ConfirmPasswordRecoveryForm,
  UpdatePasswordForm,
} from "@/components/auth/password-reset-forms";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "Definir nueva contraseña",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type NewPasswordPageProps = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

export default async function NewPasswordPage({
  searchParams,
}: NewPasswordPageProps) {
  const params = await searchParams;
  const tokenHash = params.token_hash;
  const hasRecoveryLink =
    params.type === "recovery" &&
    typeof tokenHash === "string" &&
    tokenHash.length >= 20 &&
    tokenHash.length <= 1024;

  if (hasRecoveryLink) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-amber-700 uppercase">
            Acceso administrativo
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Restablecer contraseña
          </h1>
          <ConfirmPasswordRecoveryForm tokenHash={tokenHash} />
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/recuperar-contrasena?error=expired");
  }
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-amber-700 uppercase">
          Acceso administrativo
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Nueva contraseña</h1>
        <p className="mt-3 text-slate-600">
          Al guardar se cerrarán las sesiones existentes.
        </p>
        <UpdatePasswordForm />
      </section>
    </main>
  );
}
