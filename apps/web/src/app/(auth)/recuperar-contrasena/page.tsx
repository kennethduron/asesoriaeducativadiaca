import type { Metadata } from "next";
import { RequestPasswordResetForm } from "@/components/auth/password-reset-forms";
export const metadata: Metadata = {
  title: "Recuperar contraseña",
  robots: { index: false, follow: false },
};
export default function PasswordRecoveryPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-amber-700 uppercase">
          Acceso administrativo
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Enviaremos un enlace únicamente si el correo pertenece a una cuenta
          autorizada.
        </p>
        <RequestPasswordResetForm />
      </section>
    </main>
  );
}
