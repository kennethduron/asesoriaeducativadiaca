"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useToast } from "@/components/ui/toast";

const successMessages: Record<string, string> = {
  category: "Categoría creada.",
  created: "Registro creado correctamente.",
  note: "Nota agregada.",
  service: "Servicio agregado.",
  updated: "Cambios guardados.",
  cancelled: "Cargo cancelado.",
  confirmed: "Pago confirmado.",
  voided: "Pago anulado.",
  "access-updated": "Acceso actualizado.",
  invited: "Invitación enviada.",
};

export function AdminRouteFeedback() {
  const pathname = usePathname();
  const query = useSearchParams();
  const { notify } = useToast();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const success = query.get("success");
    if (!success) return;
    const key = `${pathname}:${success}`;
    if (last.current === key) return;
    last.current = key;
    notify({
      tone: "success",
      message: successMessages[success] ?? "Operación completada.",
    });
  }, [notify, pathname, query]);
  return null;
}
