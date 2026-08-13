import type { LeadInput } from "@/lib/validation/lead";

export async function submitLead(input: LeadInput): Promise<void> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("No se pudo enviar la solicitud. Intenta nuevamente.");
  }
}
