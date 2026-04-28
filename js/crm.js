const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `diaca-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const cloneData = (data) => JSON.parse(JSON.stringify(data));

const demoUser = {
  email: "admin@diaca.hn",
  password: "diaca2026",
  name: "Admin DIACA"
};

const leadStatuses = [
  "Nuevo",
  "Contactado",
  "Esperando documentos",
  "Cotización enviada",
  "Pago pendiente",
  "En proceso",
  "Entregado",
  "Ganado",
  "Perdido"
];

const leadPriorities = ["Normal", "Urgente", "Alto valor", "Falta pago", "Falta documento"];

const messageTemplates = [
  {
    key: "initial",
    title: "Primera respuesta",
    status: "Nuevo",
    text:
      "Hola {name}, gracias por escribir a DIACA. Recibimos tu solicitud sobre {service}. Para orientarte mejor, puedes compartirnos los documentos o detalles principales?"
  },
  {
    key: "documents",
    title: "Solicitud de documentos",
    status: "Esperando documentos",
    text:
      "Hola {name}, para avanzar con tu caso de {service}, necesitamos que nos envíes los documentos pendientes o la información que tengas disponible."
  },
  {
    key: "quote",
    title: "Cotización enviada",
    status: "Cotización enviada",
    text:
      "Hola {name}, ya revisamos tu solicitud de {service}. Te compartimos la cotización y quedamos atentos a tu confirmación para iniciar."
  },
  {
    key: "payment",
    title: "Confirmación de pago",
    status: "Pago pendiente",
    text:
      "Hola {name}, quedamos atentos a la confirmación de pago para continuar con el servicio de {service}. Puedes enviarnos el comprobante por este medio."
  },
  {
    key: "delivery",
    title: "Entrega final",
    status: "Entregado",
    text:
      "Hola {name}, te compartimos la entrega final de {service}. Por favor revísala y nos confirmas si todo está correcto."
  },
  {
    key: "followup",
    title: "Seguimiento postventa",
    status: "Ganado",
    text:
      "Hola {name}, esperamos que el apoyo de DIACA con {service} te haya sido útil. Quedamos disponibles para cualquier ajuste o nuevo servicio."
  }
];

const seedData = {
  leads: [
    {
      id: createId(),
      name: "María Fernanda López",
      phone: "+504 9818-5221",
      service: "Asesoría académica",
      status: "Cotización enviada",
      priority: "Urgente",
      value: 3200,
      owner: "Equipo académico",
      note: "Tesis de grado con análisis estadístico.",
      nextFollowUp: "2026-04-28",
      createdAt: "2026-04-23",
      history: [
        {
          id: createId(),
          date: "2026-04-23",
          owner: "Equipo académico",
          note: "Solicitud recibida por tesis de grado."
        },
        {
          id: createId(),
          date: "2026-04-24",
          owner: "Equipo académico",
          note: "Cotización enviada, pendiente confirmación."
        }
      ]
    },
    {
      id: createId(),
      name: "Carlos Mejía",
      phone: "+504 9870-1122",
      service: "Asesoría legal civil",
      status: "Esperando documentos",
      priority: "Falta documento",
      value: 4500,
      owner: "Equipo legal",
      note: "Constitución de comerciante individual.",
      nextFollowUp: "2026-04-28",
      createdAt: "2026-04-24",
      history: [
        {
          id: createId(),
          date: "2026-04-24",
          owner: "Equipo legal",
          note: "Se solicitaron datos personales y requisitos iniciales."
        }
      ]
    },
    {
      id: createId(),
      name: "Andrea Pineda",
      phone: "+504 9755-3321",
      service: "Redacción profesional",
      status: "Ganado",
      priority: "Normal",
      value: 1200,
      owner: "Kenneth",
      note: "CV y carta de presentación.",
      nextFollowUp: "2026-05-02",
      createdAt: "2026-04-25",
      history: [
        {
          id: createId(),
          date: "2026-04-25",
          owner: "Kenneth",
          note: "Servicio confirmado y entregado."
        }
      ]
    },
    {
      id: createId(),
      name: "Luis Rivera",
      phone: "+504 9666-0001",
      service: "Marketing digital",
      status: "Nuevo",
      priority: "Alto valor",
      value: 2500,
      owner: "Kenneth",
      note: "Ventas por Facebook y WhatsApp.",
      nextFollowUp: "2026-04-29",
      createdAt: "2026-04-26",
      history: []
    }
  ],
  clients: [
    {
      name: "Universitaria Derecho UNAH",
      service: "Tesis y APA 7",
      status: "Activo",
      phone: "+504 9818-5221",
      balance: 1600
    },
    {
      name: "Emprendimiento local",
      service: "Registro y finanzas",
      status: "Activo",
      phone: "+504 9550-4102",
      balance: 0
    },
    {
      name: "Cliente civil familiar",
      service: "Contrato legal",
      status: "Completado",
      phone: "+504 9441-2300",
      balance: 0
    }
  ],
  cases: [
    {
      stage: "Investigación",
      title: "Informe de graduación",
      owner: "Equipo académico",
      due: "2026-04-30",
      progress: "Recopilando fuentes y estructura."
    },
    {
      stage: "Redacción",
      title: "Contrato de servicios",
      owner: "Equipo legal",
      due: "2026-05-02",
      progress: "Borrador inicial en revisión."
    },
    {
      stage: "Revisión",
      title: "Monografía psicología",
      owner: "Kenneth",
      due: "2026-05-04",
      progress: "Corrección de ortografía y formato APA."
    }
  ],
  tasks: [
    {
      id: createId(),
      title: "Enviar cotización de tesis a María Fernanda",
      due: "2026-04-27",
      owner: "Equipo académico",
      done: false
    },
    {
      id: createId(),
      title: "Confirmar requisitos SAR para Carlos Mejía",
      due: "2026-04-27",
      owner: "Equipo legal",
      done: false
    },
    {
      id: createId(),
      title: "Preparar plantilla de contrato civil",
      due: "2026-04-29",
      owner: "Kenneth",
      done: false
    }
  ]
};

const currency = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  maximumFractionDigits: 0
});

const storageKey = "diaca-crm-state";
const sessionKey = "diaca-crm-session";
let state = loadState();
let activeLeadId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeStatus(status) {
  const map = {
    Cotizado: "Cotización enviada",
    Activo: "En proceso",
    Completado: "Entregado"
  };
  return map[status] || (leadStatuses.includes(status) ? status : "Nuevo");
}

function normalizeLead(lead) {
  return {
    id: lead.id || createId(),
    name: lead.name || "Sin nombre",
    phone: lead.phone || "",
    service: lead.service || "Asesoría general",
    status: normalizeStatus(lead.status),
    priority: lead.priority || "Normal",
    value: Number(lead.value || 0),
    owner: lead.owner || "Kenneth",
    note: lead.note || "",
    nextFollowUp: lead.nextFollowUp || lead.createdAt || todayISO(),
    createdAt: lead.createdAt || todayISO(),
    history: Array.isArray(lead.history)
      ? lead.history
      : lead.note
        ? [{ id: createId(), date: lead.createdAt || todayISO(), owner: lead.owner || "Kenneth", note: lead.note }]
        : []
  };
}

function migrateState(data) {
  const migrated = {
    leads: Array.isArray(data?.leads) ? data.leads.map(normalizeLead) : cloneData(seedData.leads),
    clients: Array.isArray(data?.clients) ? data.clients : cloneData(seedData.clients),
    cases: Array.isArray(data?.cases) ? data.cases : cloneData(seedData.cases),
    tasks: Array.isArray(data?.tasks) ? data.tasks : cloneData(seedData.tasks)
  };

  migrated.tasks = migrated.tasks.map((task) => ({
    id: task.id || createId(),
    title: task.title || "Tarea sin título",
    due: task.due || todayISO(),
    owner: task.owner || "Kenneth",
    done: Boolean(task.done)
  }));

  return migrated;
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    localStorage.setItem(storageKey, JSON.stringify(seedData));
    return cloneData(seedData);
  }

  try {
    const migrated = migrateState(JSON.parse(saved));
    localStorage.setItem(storageKey, JSON.stringify(migrated));
    return migrated;
  } catch {
    localStorage.setItem(storageKey, JSON.stringify(seedData));
    return cloneData(seedData);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function getSession() {
  return localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey);
}

function setSession(email, remember) {
  const payload = JSON.stringify({ email, signedInAt: new Date().toISOString() });
  const store = remember ? localStorage : sessionStorage;
  store.setItem(sessionKey, payload);
}

function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
}

function showApp() {
  document.querySelector("#authScreen").classList.add("hidden");
  document.querySelector("#crmApp").classList.remove("hidden");
  document.querySelector("#userPill").textContent = demoUser.name;
  renderAll();
}

function showLogin() {
  document.querySelector("#authScreen").classList.remove("hidden");
  document.querySelector("#crmApp").classList.add("hidden");
}

function formatPhoneForWhatsapp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) {
    return "50498185221";
  }

  return digits.startsWith("504") ? digits : `504${digits.slice(-8)}`;
}

function fillTemplate(template, lead) {
  return template.text
    .replaceAll("{name}", lead?.name || "cliente")
    .replaceAll("{service}", lead?.service || "tu solicitud");
}

function openWhatsapp(lead, templateKey) {
  const template =
    messageTemplates.find((item) => item.key === templateKey) ||
    messageTemplates.find((item) => item.status === lead.status) ||
    messageTemplates[0];
  const text = fillTemplate(template, lead);
  window.open(`https://wa.me/${formatPhoneForWhatsapp(lead.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function setupAuth() {
  const form = document.querySelector("#loginForm");
  const error = document.querySelector("#loginError");

  if (getSession()) {
    showApp();
  } else {
    showLogin();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email")).trim().toLowerCase();
    const password = String(formData.get("password"));
    const remember = formData.get("remember") === "on";

    if (email !== demoUser.email || password !== demoUser.password) {
      error.textContent = "Correo o contraseña incorrectos.";
      return;
    }

    error.textContent = "";
    setSession(email, remember);
    showApp();
  });

  document.querySelector("#logoutBtn").addEventListener("click", () => {
    clearSession();
    showLogin();
  });
}

function renderMetrics() {
  const totalPipeline = state.leads
    .filter((lead) => !["Ganado", "Perdido"].includes(lead.status))
    .reduce((sum, lead) => sum + Number(lead.value || 0), 0);
  const won = state.leads.filter((lead) => lead.status === "Ganado").length;
  const today = todayISO();
  const dueTasks = state.tasks.filter((task) => !task.done && task.due <= today).length;
  const dueFollowUps = state.leads.filter((lead) => lead.status !== "Ganado" && lead.nextFollowUp <= today).length;
  const pendingQuotes = state.leads.filter((lead) => ["Cotización enviada", "Pago pendiente"].includes(lead.status)).length;

  const metrics = [
    ["Prospectos", state.leads.length],
    ["Pipeline abierto", currency.format(totalPipeline)],
    ["Ganados", won],
    ["Seguimientos hoy", dueFollowUps],
    ["Tareas vencidas", dueTasks],
    ["Cotizaciones/pagos", pendingQuotes]
  ];

  document.querySelector("#metricGrid").innerHTML = metrics
    .map((metric) => `<article class="metric-card"><span>${metric[0]}</span><strong>${metric[1]}</strong></article>`)
    .join("");
}

function renderPipeline() {
  const board = document.querySelector("#pipelineBoard");
  board.innerHTML = leadStatuses
    .filter((status) => status !== "Perdido")
    .map((status) => {
      const leads = state.leads.filter((lead) => lead.status === status);
      return `
        <div class="pipeline-column">
          <h4>${status} (${leads.length})</h4>
          ${leads
            .map(
              (lead) => `
                <button class="lead-chip" type="button" data-open-lead="${lead.id}">
                  <strong>${escapeHtml(lead.name)}</strong>
                  <span>${escapeHtml(lead.service)} - ${currency.format(lead.value)}</span>
                  <em>${escapeHtml(lead.priority)}</em>
                </button>
              `
            )
            .join("")}
        </div>
      `;
    })
    .join("");

  document.querySelector("#pipelineTotal").textContent = `${state.leads.length} oportunidades`;
}

function renderTasks() {
  const today = todayISO();
  const todayTasks = state.tasks.filter((task) => task.due <= today && !task.done);
  const followUpTasks = state.leads
    .filter((lead) => lead.status !== "Ganado" && lead.nextFollowUp <= today)
    .map((lead) => ({
      id: `lead-${lead.id}`,
      title: `Seguimiento: ${lead.name}`,
      due: lead.nextFollowUp,
      owner: lead.owner,
      done: false,
      leadId: lead.id
    }));

  document.querySelector("#todayCount").textContent = `${todayTasks.length + followUpTasks.length} pendientes`;
  document.querySelector("#todayTasks").innerHTML = renderTaskItems([...followUpTasks, ...todayTasks]);
  document.querySelector("#allTasks").innerHTML = renderTaskItems(state.tasks, true);
}

function renderTaskItems(tasks, allowComplete = false) {
  if (!tasks.length) {
    return `<div class="task-item"><strong>Sin tareas pendientes</strong><span>La agenda está limpia.</span></div>`;
  }

  return tasks
    .map(
      (task) => `
        <div class="task-item ${task.due <= todayISO() && !task.done ? "is-due" : ""}">
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <span>${escapeHtml(task.owner)} - vence ${escapeHtml(task.due)}</span>
          </div>
          <div class="row-actions">
            ${
              task.leadId
                ? `<button class="secondary-button" type="button" data-open-lead="${task.leadId}">Abrir ficha</button>`
                : ""
            }
            ${
              allowComplete
                ? `<button class="secondary-button" type="button" data-complete-task="${task.id}">${
                    task.done ? "Reabrir" : "Completar"
                  }</button>`
                : ""
            }
          </div>
        </div>
      `
    )
    .join("");
}

function renderLeadTable() {
  const query = document.querySelector("#leadSearch")?.value.toLowerCase() || "";
  const status = document.querySelector("#leadFilter")?.value || "all";
  const rows = state.leads.filter((lead) => {
    const haystack = `${lead.name} ${lead.service} ${lead.status} ${lead.owner} ${lead.priority}`.toLowerCase();
    return haystack.includes(query) && (status === "all" || lead.status === status);
  });

  document.querySelector("#leadTable").innerHTML = rows.length
    ? rows
        .map(
          (lead) => `
            <tr>
              <td><strong>${escapeHtml(lead.name)}</strong><br><span>${escapeHtml(lead.phone)}</span></td>
              <td>${escapeHtml(lead.service)}</td>
              <td><span class="status-pill status-${lead.status.replaceAll(" ", "-")}">${escapeHtml(lead.status)}</span></td>
              <td><span class="priority-pill priority-${lead.priority.replaceAll(" ", "-")}">${escapeHtml(lead.priority)}</span></td>
              <td>${currency.format(lead.value)}</td>
              <td>${escapeHtml(lead.owner)}<br><span>Sig. ${escapeHtml(lead.nextFollowUp)}</span></td>
              <td>
                <div class="row-actions">
                  <button class="secondary-button" type="button" data-whatsapp-lead="${lead.id}">WhatsApp</button>
                  <button class="secondary-button" type="button" data-open-lead="${lead.id}">Ficha</button>
                  <button class="secondary-button" type="button" data-next-status="${lead.id}">Avanzar</button>
                </div>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="7">No hay prospectos con ese filtro.</td></tr>`;
}

function renderClients() {
  const wonLeads = state.leads
    .filter((lead) => lead.status === "Ganado")
    .map((lead) => ({
      name: lead.name,
      service: lead.service,
      status: "Activo",
      phone: lead.phone,
      balance: lead.priority === "Falta pago" ? lead.value : 0
    }));
  const clients = [...wonLeads, ...state.clients];

  document.querySelector("#clientCards").innerHTML = clients
    .map(
      (client) => `
        <article class="client-card">
          <strong>${escapeHtml(client.name)}</strong>
          <p>${escapeHtml(client.service)}</p>
          <span class="status-pill status-${client.status}">${escapeHtml(client.status)}</span>
          <div class="client-meta">
            <span>${escapeHtml(client.phone)}</span>
            <span>Saldo ${currency.format(client.balance)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCases() {
  const stages = ["Investigación", "Redacción", "Revisión"];
  document.querySelector("#caseBoard").innerHTML = stages
    .map((stage) => {
      const cases = state.cases.filter((item) => item.stage === stage);
      return `
        <section class="case-column">
          <h3>${stage}</h3>
          ${cases
            .map(
              (item) => `
                <article class="case-card">
                  <h4>${escapeHtml(item.title)}</h4>
                  <p>${escapeHtml(item.progress)}</p>
                  <span>${escapeHtml(item.owner)} - entrega ${escapeHtml(item.due)}</span>
                </article>
              `
            )
            .join("")}
        </section>
      `;
    })
    .join("");
}

function renderTemplates() {
  document.querySelector("#templateGrid").innerHTML = messageTemplates
    .map(
      (template) => `
        <article class="template-card">
          <span class="status-pill status-${template.status.replaceAll(" ", "-")}">${escapeHtml(template.status)}</span>
          <h3>${escapeHtml(template.title)}</h3>
          <p>${escapeHtml(template.text)}</p>
          <button class="secondary-button" type="button" data-copy-template="${template.key}">Copiar plantilla</button>
        </article>
      `
    )
    .join("");
}

function renderAll() {
  renderMetrics();
  renderPipeline();
  renderTasks();
  renderLeadTable();
  renderClients();
  renderCases();
  renderTemplates();
}

function setupNavigation() {
  const titles = {
    dashboard: "Panel general",
    leads: "Prospectos",
    clients: "Clientes",
    cases: "Casos y entregas",
    tasks: "Tareas",
    templates: "Plantillas",
    settings: "Integraciones"
  };

  document.querySelectorAll(".nav-tab[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab[data-view]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".crm-view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      document.querySelector(`#${button.dataset.view}View`).classList.add("active");
      document.querySelector("#crmViewTitle").textContent = titles[button.dataset.view];
      closeCrmMenu();
    });
  });
}

function closeCrmMenu() {
  const app = document.querySelector("#crmApp");
  const toggle = document.querySelector("#crmMenuToggle");
  app?.classList.remove("crm-nav-open");
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.setAttribute("aria-label", "Abrir menú del CRM");
}

function setupCrmMenu() {
  const app = document.querySelector("#crmApp");
  const toggle = document.querySelector("#crmMenuToggle");

  if (!app || !toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = app.classList.toggle("crm-nav-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Cerrar menú del CRM" : "Abrir menú del CRM");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCrmMenu();
    }
  });
}

function setupLeadModal() {
  const modal = document.querySelector("#leadModal");
  const form = document.querySelector("#leadForm");

  document.querySelector("#openLeadModal").addEventListener("click", () => modal.showModal());
  document.querySelector("#closeLeadModal").addEventListener("click", () => modal.close());
  document.querySelector("#cancelLead").addEventListener("click", () => modal.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const lead = normalizeLead({
      id: createId(),
      name: formData.get("name"),
      phone: formData.get("phone"),
      service: formData.get("service"),
      status: formData.get("status"),
      priority: formData.get("priority"),
      value: Number(formData.get("value")),
      owner: formData.get("owner"),
      note: formData.get("note"),
      nextFollowUp: formData.get("nextFollowUp") || todayISO(),
      createdAt: todayISO(),
      history: formData.get("note")
        ? [{ id: createId(), date: todayISO(), owner: formData.get("owner"), note: formData.get("note") }]
        : []
    });

    state.leads.unshift(lead);
    saveState();
    renderAll();
    form.reset();
    modal.close();
  });
}

function populateDetailSelects(lead) {
  document.querySelector("#detailStatus").innerHTML = leadStatuses
    .map((status) => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`)
    .join("");
  document.querySelector("#detailPriority").innerHTML = leadPriorities
    .map((priority) => `<option ${priority === lead.priority ? "selected" : ""}>${priority}</option>`)
    .join("");
}

function openLeadDetail(leadId) {
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    return;
  }

  activeLeadId = leadId;
  document.querySelector("#leadDetailTitle").textContent = lead.name;
  document.querySelector("#leadSummary").innerHTML = `
    <span class="status-pill status-${lead.status.replaceAll(" ", "-")}">${escapeHtml(lead.status)}</span>
    <span class="priority-pill priority-${lead.priority.replaceAll(" ", "-")}">${escapeHtml(lead.priority)}</span>
    <dl>
      <div><dt>Teléfono</dt><dd>${escapeHtml(lead.phone)}</dd></div>
      <div><dt>Servicio</dt><dd>${escapeHtml(lead.service)}</dd></div>
      <div><dt>Valor</dt><dd>${currency.format(lead.value)}</dd></div>
      <div><dt>Responsable</dt><dd>${escapeHtml(lead.owner)}</dd></div>
      <div><dt>Creado</dt><dd>${escapeHtml(lead.createdAt)}</dd></div>
      <div><dt>Próximo seguimiento</dt><dd>${escapeHtml(lead.nextFollowUp)}</dd></div>
    </dl>
    <button class="primary-button" type="button" data-whatsapp-lead="${lead.id}">Enviar WhatsApp</button>
  `;
  document.querySelector("#leadTimeline").innerHTML = lead.history.length
    ? lead.history
        .slice()
        .reverse()
        .map(
          (item) => `
            <article>
              <strong>${escapeHtml(item.date)} - ${escapeHtml(item.owner)}</strong>
              <p>${escapeHtml(item.note)}</p>
            </article>
          `
        )
        .join("")
    : `<article><strong>Sin seguimiento registrado</strong><p>Agrega la primera nota para dejar contexto al equipo.</p></article>`;
  populateDetailSelects(lead);
  document.querySelector("#detailNextFollowUp").value = lead.nextFollowUp || todayISO();
  document.querySelector("#detailHistoryNote").value = "";
  document.querySelector("#leadDetailModal").showModal();
}

function setupLeadDetailModal() {
  const modal = document.querySelector("#leadDetailModal");
  const form = document.querySelector("#leadDetailForm");

  document.querySelector("#closeLeadDetailModal").addEventListener("click", () => modal.close());
  document.querySelector("#cancelLeadDetail").addEventListener("click", () => modal.close());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const lead = state.leads.find((item) => item.id === activeLeadId);
    if (!lead) {
      return;
    }

    const formData = new FormData(form);
    const note = String(formData.get("historyNote") || "").trim();
    lead.status = String(formData.get("status"));
    lead.priority = String(formData.get("priority"));
    lead.nextFollowUp = String(formData.get("nextFollowUp") || todayISO());

    if (note) {
      lead.history.push({
        id: createId(),
        date: todayISO(),
        owner: lead.owner,
        note
      });
      lead.note = note;
    }

    saveState();
    renderAll();
    modal.close();
  });
}

function setupLeadActions() {
  document.addEventListener("click", async (event) => {
    const nextButton = event.target.closest?.("[data-next-status]");
    const nextLeadId = nextButton?.dataset.nextStatus;
    if (nextLeadId) {
      const lead = state.leads.find((item) => item.id === nextLeadId);
      const current = leadStatuses.indexOf(lead.status);
      lead.status = leadStatuses[Math.min(current + 1, leadStatuses.length - 2)];
      lead.history.push({
        id: createId(),
        date: todayISO(),
        owner: lead.owner,
        note: `Estado actualizado a ${lead.status}.`
      });
      saveState();
      renderAll();
      return;
    }

    const taskButton = event.target.closest?.("[data-complete-task]");
    const taskId = taskButton?.dataset.completeTask;
    if (taskId) {
      const task = state.tasks.find((item) => item.id === taskId);
      task.done = !task.done;
      saveState();
      renderAll();
      return;
    }

    const openButton = event.target.closest?.("[data-open-lead]");
    const openLeadId = openButton?.dataset.openLead;
    if (openLeadId) {
      openLeadDetail(openLeadId);
      return;
    }

    const whatsappButton = event.target.closest?.("[data-whatsapp-lead]");
    const whatsappLeadId = whatsappButton?.dataset.whatsappLead;
    if (whatsappLeadId) {
      const lead = state.leads.find((item) => item.id === whatsappLeadId);
      openWhatsapp(lead);
      return;
    }

    const copyButton = event.target.closest?.("[data-copy-template]");
    const templateKey = copyButton?.dataset.copyTemplate;
    if (templateKey) {
      const template = messageTemplates.find((item) => item.key === templateKey);
      await navigator.clipboard?.writeText(template.text);
      copyButton.textContent = "Copiada";
      setTimeout(() => {
        copyButton.textContent = "Copiar plantilla";
      }, 1400);
    }
  });

  document.querySelector("#leadSearch").addEventListener("input", renderLeadTable);
  document.querySelector("#leadFilter").addEventListener("change", renderLeadTable);
}

function setupTaskForm() {
  document.querySelector("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.tasks.unshift({
      id: createId(),
      title: formData.get("title"),
      due: formData.get("due"),
      owner: formData.get("owner"),
      done: false
    });
    saveState();
    event.currentTarget.reset();
    renderAll();
  });
}

function setupExport() {
  document.querySelector("#exportCsvBtn").addEventListener("click", () => {
    const headers = ["Nombre", "Teléfono", "Servicio", "Estado", "Prioridad", "Valor", "Responsable", "Próximo seguimiento", "Nota"];
    const rows = state.leads.map((lead) => [
      lead.name,
      lead.phone,
      lead.service,
      lead.status,
      lead.priority,
      lead.value,
      lead.owner,
      lead.nextFollowUp,
      lead.note
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "diaca-prospectos.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
    console.info("Service worker pendiente hasta configurar Firebase Cloud Messaging.");
  });
}

setupAuth();
setupNavigation();
setupCrmMenu();
setupLeadModal();
setupLeadDetailModal();
setupLeadActions();
setupTaskForm();
setupExport();
registerServiceWorker();
