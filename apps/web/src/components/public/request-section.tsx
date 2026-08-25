import { ContactForm } from "@/components/public/contact-form";

type RequestSectionProps = {
  compactCopy?: boolean;
};

export function RequestSection({ compactCopy = false }: RequestSectionProps) {
  return (
    <section id="solicitud" className="request-section">
      <div className="request-copy" data-reveal>
        <p className="eyebrow">Solicitud de asesoría</p>
        <h2>
          {compactCopy
            ? "Un formulario breve para iniciar bien."
            : "Cuéntanos qué necesitas y preparamos una respuesta clara."}
        </h2>
        <p>
          {compactCopy
            ? "Comparte los datos esenciales y tu solicitud quedará registrada para que el equipo pueda dar seguimiento de forma ordenada."
            : "Completa el formulario y tu solicitud quedará registrada para que el equipo pueda revisar el caso, confirmar alcance y darte seguimiento."}
        </p>
        <div className="request-highlights" aria-label="Ventajas del proceso">
          <span>
            {compactCopy ? "Datos organizados" : "Respuesta ordenada"}
          </span>
          <span>{compactCopy ? "Respuesta clara" : "Datos organizados"}</span>
          <span>Seguimiento profesional</span>
        </div>
      </div>
      <ContactForm />
    </section>
  );
}
