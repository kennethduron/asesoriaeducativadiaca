import { z } from "zod";

export const serviceOptions = [
  "Asesoría académica",
  "Servicios legales civiles",
  "Redacción profesional",
  "Trámites y registros",
  "Digital y tecnología",
  "Emprendimiento y finanzas",
] as const;

export const priorityOptions = [
  "Normal",
  "Urgente",
  "Solo cotización",
] as const;

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Escribe tu nombre completo.")
    .max(120, "Usa 120 caracteres o menos."),
  email: z
    .email("Escribe un correo válido.")
    .trim()
    .max(254, "Usa 254 caracteres o menos.")
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(40, "Usa 40 caracteres o menos.")
    .refine(
      (value) =>
        !value ||
        (/^[+\d\s().-]+$/.test(value) &&
          (value.match(/\d/g) ?? []).length >= 7),
      "Usa un número de teléfono válido.",
    ),
  service: z.enum(serviceOptions, { error: "Selecciona un servicio." }),
  priority: z.enum(priorityOptions, { error: "Selecciona una prioridad." }),
  message: z
    .string()
    .trim()
    .min(1, "Describe brevemente tu solicitud.")
    .max(1200, "Usa 1200 caracteres o menos."),
  organization_site: z.string().trim().max(200).default(""),
});

export type LeadInput = z.infer<typeof leadSchema>;
