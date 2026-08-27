import { z } from "zod";

export const usernamePattern = /^[a-zA-Z0-9._-]{3,30}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "El nombre de usuario debe tener entre 3 y 30 caracteres.")
  .max(30, "El nombre de usuario debe tener entre 3 y 30 caracteres.")
  .regex(
    usernamePattern,
    "Usa solo letras, números, punto, guion o guion bajo, sin espacios.",
  )
  .transform(normalizeUsername);

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña no puede exceder 128 caracteres.");

export const confirmedPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmation: z.string(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmation) {
      context.addIssue({
        code: "custom",
        path: ["confirmation"],
        message: "Las contraseñas no coinciden.",
      });
    }
  });

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .transform((value) => value.toLowerCase());
