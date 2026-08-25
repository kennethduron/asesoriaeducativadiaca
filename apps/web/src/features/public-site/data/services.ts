export type ServiceIconName =
  "graduation" | "scale" | "pen" | "file" | "device" | "chart";

export type ServiceSummary = {
  icon: ServiceIconName;
  title: string;
  description: string;
  bullets: readonly string[];
};

export const serviceSummaries: readonly ServiceSummary[] = [
  {
    icon: "graduation",
    title: "Asesoría académica",
    description:
      "Acompañamiento para tesis, monografías, ensayos, informes, marcos teóricos y metodología.",
    bullets: ["Normas APA 7", "Análisis de datos", "Corrección de redacción"],
  },
  {
    icon: "scale",
    title: "Servicios legales civiles",
    description:
      "Apoyo profesional en trámites de derecho civil, contratos y documentación legal.",
    bullets: ["Divorcios civiles", "Herencias", "Poderes y permisos"],
  },
  {
    icon: "pen",
    title: "Redacción profesional",
    description:
      "Documentos claros para vida laboral y profesional con formato cuidado.",
    bullets: ["CV", "Cartas de trabajo", "Contratos"],
  },
  {
    icon: "file",
    title: "Trámites y registros",
    description:
      "Gestión para comerciantes individuales, permisos, RTN, SAR y documentación operativa.",
    bullets: ["Comerciante individual", "Constitución de empresa", "Permisos"],
  },
  {
    icon: "device",
    title: "Digital y tecnología",
    description:
      "Soporte en Word, Excel, correos, documentos, páginas web y tareas digitales.",
    bullets: ["Excel", "Documentos", "Páginas web"],
  },
  {
    icon: "chart",
    title: "Emprendimiento y finanzas",
    description:
      "Orientación para iniciar negocio, organizar ideas, presupuestos y control de gastos.",
    bullets: ["Ideas de negocio", "Presupuestos", "Deudas"],
  },
] as const;

export const serviceDetails = [
  {
    number: "01",
    title: "Asesoría académica",
    description:
      "Tesis, monografías, ensayos, informes, marcos teóricos, metodología y revisión de estilo.",
    bullets: [
      "Normas APA 7 y formato académico.",
      "Análisis de datos y estadística.",
      "Corrección de redacción y estructura.",
    ],
  },
  {
    number: "02",
    title: "Redacción profesional",
    description:
      "Documentos formales para vida laboral, empresarial y académica con presentación cuidada.",
    bullets: [
      "CV, cartas y perfiles profesionales.",
      "Informes, propuestas y contratos base.",
      "Revisión de ortografía y coherencia.",
    ],
  },
  {
    number: "03",
    title: "Trámites y registros",
    description:
      "Orientación para ordenar requisitos, preparar documentos y dar seguimiento a gestiones.",
    bullets: [
      "Comerciante individual y constituciones.",
      "Permisos, RTN, SAR y documentación.",
      "Listas de requisitos por tipo de trámite.",
    ],
  },
  {
    number: "04",
    title: "Digital y tecnología",
    description:
      "Apoyo práctico para documentos, hojas de cálculo, correos, páginas web y tareas digitales.",
    bullets: [
      "Word, Excel y presentaciones.",
      "Organización de archivos y formatos.",
      "Soluciones digitales para emprendimientos.",
    ],
  },
  {
    number: "05",
    title: "Emprendimiento",
    description:
      "Acompañamiento para convertir ideas en planes más claros y accionables.",
    bullets: [
      "Ideas de negocio y propuestas.",
      "Presupuestos y control básico.",
      "Organización comercial inicial.",
    ],
  },
  {
    number: "06",
    title: "Finanzas básicas",
    description:
      "Orientación sencilla para presupuestos, deudas, costos y decisiones financieras iniciales.",
    bullets: [
      "Control de gastos personales o negocio.",
      "Estimación de costos y precios.",
      "Orden de pagos y prioridades.",
    ],
  },
] as const;
