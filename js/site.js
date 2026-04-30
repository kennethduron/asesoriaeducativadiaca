const services = [
  {
    icon: "graduation",
    title: "Asesoría académica",
    description: "Acompañamiento para tesis, monografías, ensayos, informes, marcos teóricos y metodología.",
    bullets: ["Normas APA 7", "Análisis de datos", "Corrección de redacción"]
  },
  {
    icon: "scale",
    title: "Servicios legales civiles",
    description: "Apoyo profesional en trámites de derecho civil, contratos y documentación legal.",
    bullets: ["Divorcios civiles", "Herencias", "Poderes y permisos"]
  },
  {
    icon: "pen",
    title: "Redacción profesional",
    description: "Documentos claros para vida laboral y profesional con formato cuidado.",
    bullets: ["CV", "Cartas de trabajo", "Contratos"]
  },
  {
    icon: "file",
    title: "Trámites y registros",
    description: "Gestión para comerciantes individuales, permisos, RTN, SAR y documentación operativa.",
    bullets: ["Comerciante individual", "Constitución de empresa", "Permisos"]
  },
  {
    icon: "device",
    title: "Digital y tecnología",
    description: "Soporte en Word, Excel, correos, documentos, páginas web y tareas digitales.",
    bullets: ["Excel", "Documentos", "Páginas web"]
  },
  {
    icon: "chart",
    title: "Emprendimiento y finanzas",
    description: "Orientación para iniciar negocio, organizar ideas, presupuestos y control de gastos.",
    bullets: ["Ideas de negocio", "Presupuestos", "Deudas"]
  }
];

const grid = document.querySelector("#serviceGrid");
const header = document.querySelector(".site-header");
const menuToggle = document.querySelector("#menuToggle");
const siteMenu = document.querySelector("#siteMenu");
const requestForm = document.querySelector("#requestForm");
const requestStatus = document.querySelector("#requestStatus");
const hondurasTimeNodes = document.querySelectorAll("[data-honduras-time]");
const siteConfig = window.DIACA_CONFIG || {};
const backendUrl = String(siteConfig.backendUrl || "").replace(/\/$/, "");
const supabaseUrl = String(siteConfig.supabaseUrl || "").replace(/\/$/, "");
const supabaseAnonKey = siteConfig.supabaseAnonKey || "";

const serviceIcons = {
  graduation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l9-4 9 4-9 4-9-4Z" /><path d="M7 10v5c2.8 2 7.2 2 10 0v-5" /><path d="M21 8v6" /></svg>',
  scale: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 20h14M6 7h12" /><path d="M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7Z" /></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z" /><path d="M13 7l4 4" /></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6V3Z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></svg>',
  device: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H4V5Z" /><path d="M8 21h8M12 16v5" /></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>'
};

if (grid) {
  grid.innerHTML = services
    .map(
      (service) => `
        <article class="service-card">
          <span class="service-icon">${serviceIcons[service.icon]}</span>
          <h3>${service.title}</h3>
          <p>${service.description}</p>
          <ul>${service.bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
        </article>
      `
    )
    .join("");
}

if (header && menuToggle && siteMenu) {
  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const closeMenu = () => {
    header.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
  };

  const isMenuOpen = () => header.classList.contains("menu-open");

  const openMenu = () => {
    header.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Cerrar menú");
  };

  menuToggle.addEventListener("click", () => {
    if (header.classList.contains("menu-open")) {
      closeMenu();
      return;
    }

    openMenu();
  });

  siteMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!isMenuOpen()) {
      return;
    }

    if (header.contains(event.target)) {
      return;
    }

    closeMenu();
  });

  window.addEventListener(
    "scroll",
    () => {
      if (isMenuOpen()) {
        closeMenu();
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    () => {
      if (isMenuOpen()) {
        closeMenu();
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", closeMenu);
}

if (hondurasTimeNodes.length) {
  const timeFormatter = new Intl.DateTimeFormat("es-HN", {
    timeZone: "America/Tegucigalpa",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const isoFormatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const updateHondurasTime = () => {
    const now = new Date();
    const label = timeFormatter.format(now).replace(" a. m.", " AM").replace(" p. m.", " PM");
    const isoLike = isoFormatter.format(now).replace(" ", "T");
    hondurasTimeNodes.forEach((node) => {
      node.textContent = `HN ${label}`;
      node.setAttribute("datetime", isoLike);
      node.setAttribute("title", "Hora actual de Honduras");
    });
  };

  updateHondurasTime();
  setInterval(updateHondurasTime, 1000);
}

if (requestForm) {
  const showToast = (message, tone = "success") => {
    const toast = document.createElement("div");
    toast.className = `site-toast ${tone}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => toast.remove(), 260);
    }, 4200);
  };

  const submitLeadToCrm = async (lead) => {
    const response = await fetch(`${backendUrl}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(lead)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo registrar la solicitud.");
    }
  };

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(requestForm);
    const name = String(formData.get("name")).trim();
    const phone = String(formData.get("phone")).trim();
    const service = String(formData.get("service")).trim();
    const priority = String(formData.get("priority")).trim();
    const message = String(formData.get("message")).trim();
    const submitButton = requestForm.querySelector('button[type="submit"]');
    const today = new Date().toISOString().slice(0, 10);

    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";

    if (requestStatus) {
      requestStatus.textContent = "Enviando solicitud al CRM...";
    }

    try {
      await submitLeadToCrm({
        name,
        phone,
        service,
        status: "Nuevo",
        priority,
        value: 0,
        owner: "Sitio web",
        note: message,
        next_follow_up: today,
        history: [
          {
            id: `web-${Date.now()}`,
            date: today,
            owner: "Sitio web",
            note: message
          }
        ]
      });

      if (requestStatus) {
        requestStatus.textContent = "";
      }

      showToast("Solicitud enviada. Gracias, nos comunicaremos pronto.");
      requestForm.reset();
    } catch (error) {
      if (requestStatus) {
        requestStatus.textContent = "No se pudo enviar la solicitud. Intenta nuevamente.";
      }
      showToast(error.message || "No se pudo enviar la solicitud.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Enviar solicitud";
    }
  });
}

