"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitLead } from "@/lib/leads/client";
import {
  leadSchema,
  priorityOptions,
  serviceOptions,
} from "@/lib/validation/lead";

type FieldName = "name" | "phone" | "service" | "priority" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

const getValue = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{
    tone: "success" | "error" | "pending";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = leadSchema.safeParse({
      name: getValue(formData, "name"),
      phone: getValue(formData, "phone"),
      service: getValue(formData, "service"),
      priority: getValue(formData, "priority"),
      message: getValue(formData, "message"),
      organization_site: getValue(formData, "organization_site"),
    });

    if (!result.success) {
      const nextErrors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as FieldName | undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setFieldErrors(nextErrors);
      setStatus({
        tone: "error",
        message: "Revisa los campos indicados antes de enviar.",
      });
      return;
    }

    setPending(true);
    setFieldErrors({});
    setStatus({
      tone: "pending",
      message: "Enviando solicitud al equipo DIACA…",
    });

    try {
      await submitLead(result.data);
      form.reset();
      setStatus({
        tone: "success",
        message: "Solicitud enviada. Gracias, nos comunicaremos pronto.",
      });
    } catch {
      setStatus({
        tone: "error",
        message:
          "No se pudo enviar la solicitud. Intenta nuevamente o escríbenos por WhatsApp.",
      });
    } finally {
      setPending(false);
    }
  }

  const errorId = (field: FieldName) =>
    fieldErrors[field] ? `${field}-error` : undefined;

  return (
    <form
      className="request-form"
      onSubmit={handleSubmit}
      noValidate
      data-reveal
    >
      <div className="form-row">
        <label>
          Nombre completo
          <Input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={120}
            required
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={errorId("name")}
          />
          {fieldErrors.name && (
            <span className="field-error" id="name-error">
              {fieldErrors.name}
            </span>
          )}
        </label>
        <label>
          Teléfono
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+504"
            maxLength={40}
            required
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={errorId("phone")}
          />
          {fieldErrors.phone && (
            <span className="field-error" id="phone-error">
              {fieldErrors.phone}
            </span>
          )}
        </label>
      </div>
      <div className="form-row">
        <label>
          Tipo de servicio
          <select
            name="service"
            defaultValue=""
            required
            aria-invalid={Boolean(fieldErrors.service)}
            aria-describedby={errorId("service")}
          >
            <option value="" disabled>
              Seleccionar servicio
            </option>
            {serviceOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {fieldErrors.service && (
            <span className="field-error" id="service-error">
              {fieldErrors.service}
            </span>
          )}
        </label>
        <label>
          Prioridad
          <select
            name="priority"
            defaultValue="Normal"
            required
            aria-invalid={Boolean(fieldErrors.priority)}
            aria-describedby={errorId("priority")}
          >
            {priorityOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          {fieldErrors.priority && (
            <span className="field-error" id="priority-error">
              {fieldErrors.priority}
            </span>
          )}
        </label>
      </div>
      <label>
        Detalle de la solicitud
        <Textarea
          name="message"
          rows={5}
          maxLength={1200}
          placeholder="Describe brevemente qué necesitas, fechas importantes o documentos relacionados."
          required
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={errorId("message")}
        />
        {fieldErrors.message && (
          <span className="field-error" id="message-error">
            {fieldErrors.message}
          </span>
        )}
      </label>
      <div className="form-honeypot" aria-hidden="true">
        <label htmlFor="organizationSite">Sitio web de la organización</label>
        <input
          id="organizationSite"
          name="organization_site"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          maxLength={200}
        />
      </div>
      <div className="request-actions">
        <p
          className={`request-status${status ? ` ${status.tone}` : ""}`}
          aria-live="polite"
          role="status"
        >
          {status?.message}
        </p>
        <Button
          className="primary-button large"
          type="submit"
          disabled={pending}
        >
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
