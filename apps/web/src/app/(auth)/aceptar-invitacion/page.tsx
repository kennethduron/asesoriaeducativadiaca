import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";

import {
  CompleteUserInvitationForm,
  ConfirmUserInvitationForm,
} from "@/components/auth/user-invitation-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Aceptar invitación",
  description: "Completa tu cuenta administrativa de DIACA.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const errorMessages: Record<string, { title: string; message: string }> = {
  expired: {
    title: "La invitación expiró",
    message:
      "Solicita al Owner que reenvíe la invitación desde el directorio de usuarios.",
  },
  invalid: {
    title: "Invitación inválida",
    message: "Este enlace no puede verificarse. Solicita una nueva invitación.",
  },
  used: {
    title: "Invitación ya utilizada",
    message:
      "La cuenta asociada ya fue completada o la invitación dejó de estar disponible.",
  },
  "rate-limited": {
    title: "Espera unos minutos",
    message:
      "Se alcanzó el límite de verificaciones. Inténtalo nuevamente más tarde.",
  },
};

function InvitationShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(217,173,79,.16),transparent_34%),#f8fafc] px-5 py-12">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="border-t-4 border-[#d9ad4f] bg-[#0b2341] px-6 py-6 text-white sm:px-8">
          <p className="text-xs font-bold tracking-[0.18em] text-amber-300 uppercase">
            DIACA · Acceso
          </p>
          <p className="mt-2 text-sm text-slate-300">Asesoría Educativa</p>
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </section>
    </main>
  );
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.success === "created") {
    return (
      <InvitationShell>
        <CheckCircle2 className="size-11 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold text-slate-950">
          Cuenta creada correctamente
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Tu acceso fue activado con el rol asignado por DIACA. Ya puedes
          iniciar sesión con tu nueva contraseña.
        </p>
        <Link
          href="/login"
          className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-[#0b2341] px-5 font-semibold text-white"
        >
          Iniciar sesión
        </Link>
      </InvitationShell>
    );
  }

  const error =
    typeof params.error === "string" ? errorMessages[params.error] : null;
  if (error) {
    return (
      <InvitationShell>
        <KeyRound className="size-10 text-amber-700" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold text-slate-950">
          {error.title}
        </h1>
        <p className="mt-3 leading-7 text-slate-600">{error.message}</p>
        <Link
          href="/login"
          className="mt-7 flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-semibold text-[#0b2341]"
        >
          Ir al acceso
        </Link>
      </InvitationShell>
    );
  }

  const tokenHash = params.token_hash;
  if (
    params.type === "invite" &&
    typeof tokenHash === "string" &&
    tokenHash.length >= 20 &&
    tokenHash.length <= 1024
  ) {
    return (
      <InvitationShell>
        <KeyRound className="size-10 text-amber-700" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold text-slate-950">
          Aceptar invitación
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Continúa para verificar el enlace y preparar tu cuenta administrativa.
        </p>
        <ConfirmUserInvitationForm tokenHash={tokenHash} />
      </InvitationShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const invitationResult = user
    ? await supabase.rpc("get_my_user_invitation")
    : null;
  const invitation = invitationResult?.data?.[0];

  if (!user || !invitation || invitation.invitation_status !== "pending") {
    return (
      <InvitationShell>
        <KeyRound className="size-10 text-amber-700" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold text-slate-950">
          Invitación requerida
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Abre el enlace personal que recibiste por correo para completar tu
          cuenta.
        </p>
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
      <p className="text-sm font-semibold text-amber-700 uppercase">
        Invitación validada
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">
        Crea tu contraseña
      </h1>
      <dl className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Nombre</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {invitation.full_name}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Rol asignado</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {invitation.role_name}
          </dd>
        </div>
        <div className="min-w-0 sm:col-span-2">
          <dt className="text-slate-500">Correo</dt>
          <dd className="mt-1 truncate font-semibold text-slate-900">
            {invitation.invitation_email}
          </dd>
        </div>
      </dl>
      <CompleteUserInvitationForm />
    </InvitationShell>
  );
}
