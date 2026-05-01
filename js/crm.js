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
const crmConfig = window.DIACA_CONFIG || {};
const backendUrl = String(crmConfig.backendUrl || "https://asesoriaeducativadiaca-bih6.vercel.app").replace(/\/$/, "");
const supabaseUrl = String(crmConfig.supabaseUrl || "").replace(/\/$/, "");
const supabaseAnonKey = crmConfig.supabaseAnonKey || "";
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);
let state = loadState();
let activeLeadId = null;
let remoteSession = null;
let sessionRemembered = false;

function repairText(value) {
  if (typeof value !== "string" || !/[ÃÂ]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

function repairStoredText(value) {
  if (Array.isArray(value)) {
    return value.map(repairStoredText);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairStoredText(item)]));
  }

  return repairText(value);
}

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
  const source = repairStoredText(data);
  const migrated = {
    leads: Array.isArray(source?.leads) ? source.leads.map(normalizeLead) : cloneData(seedData.leads),
    clients: Array.isArray(source?.clients) ? source.clients : cloneData(seedData.clients),
    cases: Array.isArray(source?.cases) ? source.cases : cloneData(seedData.cases),
    tasks: Array.isArray(source?.tasks) ? source.tasks : cloneData(seedData.tasks)
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

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${remoteSession?.accessToken || supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRequest(table, options = {}) {
  const query = options.query ? `?${options.query}` : "";
  if (remoteSession?.refreshToken) {
    await ensureFreshSession();
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    method: options.method || "GET",
    headers: supabaseHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase error ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function signInWithSupabase(email, password) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error_description || data.msg || "No se pudo iniciar sesión en Supabase.");
  }

  const data = await response.json();
  return {
    email: data.user?.email || email,
    name: data.user?.user_metadata?.name || "Admin DIACA",
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at
  };
}

async function refreshSupabaseSession(session) {
  if (!hasSupabase || !session?.refreshToken) {
    throw new Error("No hay una sesión válida para renovar.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  });

  if (!response.ok) {
    throw new Error("La sesión venció. Inicia sesión otra vez.");
  }

  const data = await response.json();
  return {
    email: data.user?.email || session.email,
    name: data.user?.user_metadata?.name || session.name || "Admin DIACA",
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: data.expires_at
  };
}

function isSessionExpiring(session) {
  const expiresAt = Number(session?.expiresAt || 0);
  if (!expiresAt) {
    return true;
  }

  return expiresAt * 1000 <= Date.now() + 60000;
}

async function ensureFreshSession() {
  if (!hasSupabase || !remoteSession?.refreshToken || !isSessionExpiring(remoteSession)) {
    return remoteSession;
  }

  remoteSession = await refreshSupabaseSession(remoteSession);
  setSession(remoteSession, sessionRemembered);
  return remoteSession;
}

async function resolveSupabaseLogin(login) {
  const normalizedLogin = String(login || "").trim().toLowerCase();
  if (normalizedLogin.includes("@")) {
    return normalizedLogin;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_admin_login`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ login: normalizedLogin })
  });

  if (!response.ok) {
    throw new Error("No se pudo validar el usuario.");
  }

  const email = await response.json();
  if (!email) {
    throw new Error("Usuario o correo no autorizado.");
  }

  return String(email).toLowerCase();
}

function leadFromDb(row) {
  return normalizeLead({
    id: row.id,
    name: row.name,
    phone: row.phone,
    service: row.service,
    status: row.status,
    priority: row.priority,
    value: row.value,
    owner: row.owner,
    note: row.note,
    nextFollowUp: row.next_follow_up || String(row.created_at || "").slice(0, 10),
    createdAt: String(row.created_at || "").slice(0, 10),
    history: Array.isArray(row.history) ? row.history : []
  });
}

function leadToDb(lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    service: lead.service,
    status: lead.status,
    priority: lead.priority,
    value: lead.value,
    owner: lead.owner,
    note: lead.note,
    next_follow_up: lead.nextFollowUp || null,
    history: lead.history || []
  };
}

function clientFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    service: row.service,
    status: row.status,
    balance: Number(row.balance || 0)
  };
}

function caseFromDb(row) {
  return {
    id: row.id,
    stage: row.stage,
    title: row.title,
    owner: row.owner,
    due: row.due,
    progress: row.progress
  };
}

function taskFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner,
    due: row.due,
    done: Boolean(row.done)
  };
}

async function loadRemoteState() {
  if (!hasSupabase || !remoteSession?.accessToken) {
    return loadState();
  }

  const [leads, clients, cases, tasks] = await Promise.all([
    supabaseRequest("leads", { query: "select=*&order=created_at.desc" }),
    supabaseRequest("clients", { query: "select=*&order=created_at.desc" }),
    supabaseRequest("cases", { query: "select=*&order=created_at.desc" }),
    supabaseRequest("tasks", { query: "select=*&order=due.asc" })
  ]);

  return migrateState({
    leads: leads.map(leadFromDb),
    clients: clients.map(clientFromDb),
    cases: cases.map(caseFromDb),
    tasks: tasks.map(taskFromDb)
  });
}

async function saveLeadRemote(lead) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return lead;
  }

  const rows = await supabaseRequest("leads", {
    method: "POST",
    query: "on_conflict=id",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: leadToDb(lead)
  });

  return rows?.[0] ? leadFromDb(rows[0]) : lead;
}

async function updateLeadRemote(lead) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return lead;
  }

  const rows = await supabaseRequest("leads", {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(lead.id)}`,
    headers: { Prefer: "return=representation" },
    body: leadToDb(lead)
  });

  return rows?.[0] ? leadFromDb(rows[0]) : lead;
}

async function saveTaskRemote(task) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return task;
  }

  const rows = await supabaseRequest("tasks", {
    method: "POST",
    query: "on_conflict=id",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: task
  });

  return rows?.[0] ? taskFromDb(rows[0]) : task;
}

async function savePushTokenRemote(token) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    throw new Error("Supabase debe estar conectado para guardar el dispositivo.");
  }

  await ensureFreshSession();

  if (!backendUrl) {
    throw new Error("Falta configurar el backend de Vercel.");
  }

  const response = await fetch(`${backendUrl}/api/push-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${remoteSession.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      userAgent: navigator.userAgent
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      clearSession();
      throw new Error("Tu sesión venció. Inicia sesión otra vez y vuelve a activar la campana.");
    }

    if (response.status === 403) {
      throw new Error("Tu correo no está autorizado como admin en Supabase.");
    }

    throw new Error(data.error || "No se pudo guardar el dispositivo. Revisa la tabla push_tokens y las variables de Vercel.");
  }

  return response.json().catch(() => ({ ok: true }));
}

async function updateTaskRemote(task) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return task;
  }

  const rows = await supabaseRequest("tasks", {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(task.id)}`,
    headers: { Prefer: "return=representation" },
    body: task
  });

  return rows?.[0] ? taskFromDb(rows[0]) : task;
}

function getSession() {
  const localSession = localStorage.getItem(sessionKey);
  const sessionSession = sessionStorage.getItem(sessionKey);
  const raw = localSession || sessionSession;
  sessionRemembered = Boolean(localSession);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { email: raw };
  }
}

function setSession(session, remember) {
  const payload = JSON.stringify({ ...session, signedInAt: new Date().toISOString() });
  const store = remember ? localStorage : sessionStorage;
  store.setItem(sessionKey, payload);
}

function clearSession() {
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
}

async function showApp() {
  document.querySelector("#authScreen").classList.add("hidden");
  document.querySelector("#crmApp").classList.remove("hidden");
  document.querySelector("#userPill").textContent = remoteSession?.name || demoUser.name;
  try {
    await ensureFreshSession();
    state = await loadRemoteState();
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    if (/JWT expired|sesión venció|Unauthorized/i.test(error.message)) {
      clearSession();
      remoteSession = null;
      showLogin();
      alert("Tu sesión venció. Inicia sesión otra vez para continuar.");
      return;
    }

    alert(`No se pudo cargar Supabase: ${error.message}`);
  }
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

async function setupAuth() {
  const form = document.querySelector("#loginForm");
  const error = document.querySelector("#loginError");

  remoteSession = getSession();
  if (hasSupabase && !remoteSession?.accessToken) {
    clearSession();
    remoteSession = null;
  }
  if (remoteSession) {
    try {
      await ensureFreshSession();
      await showApp();
    } catch {
      clearSession();
      remoteSession = null;
      showLogin();
    }
  } else {
    showLogin();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const login = String(formData.get("login")).trim().toLowerCase();
    const password = String(formData.get("password"));
    const remember = formData.get("remember") === "on";

    try {
      if (hasSupabase) {
        const email = await resolveSupabaseLogin(login);
        remoteSession = await signInWithSupabase(email, password);
      } else if (login !== demoUser.email || password !== demoUser.password) {
        throw new Error("Correo o contraseña incorrectos.");
      } else {
        remoteSession = { email: login, name: demoUser.name };
      }

      error.textContent = "";
      setSession(remoteSession, remember);
      await showApp();
    } catch (loginError) {
      error.textContent = loginError.message || "No se pudo iniciar sesión.";
    }

    /*
    if (false) {
      error.textContent = "Correo o contraseña incorrectos.";
      return;
    }

    error.textContent = "";
    setSession(email, remember);
    showApp();
    */
  });

  document.querySelector("#logoutBtn").addEventListener("click", () => {
    remoteSession = null;
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
    templates: "Plantillas"
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
  const sidebar = document.querySelector("#crmSidebar");

  if (!app || !toggle || !sidebar) {
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

  document.addEventListener("click", (event) => {
    if (!app.classList.contains("crm-nav-open")) {
      return;
    }

    const clickedMenu = sidebar.contains(event.target);
    const clickedToggle = toggle.contains(event.target);
    if (!clickedMenu && !clickedToggle) {
      closeCrmMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 961px)").matches) {
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

  form.addEventListener("submit", async (event) => {
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

    const savedLead = await saveLeadRemote(lead);
    state.leads.unshift(savedLead);
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

  form.addEventListener("submit", async (event) => {
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

    const savedLead = await updateLeadRemote(lead);
    const savedIndex = state.leads.findIndex((item) => item.id === savedLead.id);
    if (savedIndex >= 0) {
      state.leads[savedIndex] = savedLead;
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
      const savedLead = await updateLeadRemote(lead);
      const savedIndex = state.leads.findIndex((item) => item.id === savedLead.id);
      if (savedIndex >= 0) {
        state.leads[savedIndex] = savedLead;
      }
      saveState();
      renderAll();
      return;
    }

    const taskButton = event.target.closest?.("[data-complete-task]");
    const taskId = taskButton?.dataset.completeTask;
    if (taskId) {
      const task = state.tasks.find((item) => item.id === taskId);
      task.done = !task.done;
      const savedTask = await updateTaskRemote(task);
      const savedIndex = state.tasks.findIndex((item) => item.id === savedTask.id);
      if (savedIndex >= 0) {
        state.tasks[savedIndex] = savedTask;
      }
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
  document.querySelector("#taskForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const task = {
      id: createId(),
      title: formData.get("title"),
      due: formData.get("due"),
      owner: formData.get("owner"),
      done: false
    };
    const savedTask = await saveTaskRemote(task);
    state.tasks.unshift(savedTask);
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
    return Promise.resolve(null);
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(() => {
    console.info("Service worker pendiente hasta configurar Firebase Cloud Messaging.");
    return null;
  });
}

function setupNotifications() {
  const button = document.querySelector("#enableNotificationsBtn");
  if (!button) {
    return;
  }

  const setButtonReady = () => {
    button.classList.add("is-enabled");
    button.setAttribute("title", "Notificaciones activadas");
    button.setAttribute("aria-label", "Notificaciones activadas");
  };

  if ("Notification" in window && Notification.permission === "granted") {
    setButtonReady();
  }

  button.addEventListener("click", async () => {
    try {
      const firebaseConfig = crmConfig.firebase || {};
      const publicVapidKey = firebaseConfig.publicVapidKey || firebaseConfig.vapidKey || "";
      if (!publicVapidKey) {
        alert("Falta configurar la clave pública Web Push. No pegues la clave privada en el frontend.");
        return;
      }

      if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.firebase?.messaging) {
        alert("Este navegador no soporta notificaciones push web.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado. Actívalo en la configuración del navegador.");
        return;
      }

      const swRegistration = await registerServiceWorker();
      if (!swRegistration) {
        throw new Error("No se pudo registrar el service worker.");
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      const messaging = firebase.messaging();
      messaging.onMessage((payload) => {
        const title = payload.notification?.title || "DIACA CRM";
        const body = payload.notification?.body || payload.data?.body || "Tienes una nueva solicitud pendiente.";
        new Notification(title, {
          body,
          icon: "/assets/favicon.svg",
          data: {
            url: payload.data?.url || "/crm.html"
          }
        });
      });

      const token = await messaging.getToken({
        vapidKey: publicVapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        throw new Error("Firebase no devolvió token para este dispositivo.");
      }

      const result = await savePushTokenRemote(token);
      setButtonReady();
      alert(
        result?.testSent
          ? "Listo. Enviamos una notificacion de prueba a este dispositivo."
          : "Listo. Este dispositivo ya puede recibir notificaciones."
      );
    } catch (error) {
      alert(error.message || "No se pudieron activar las notificaciones.");
    }
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
setupNotifications();
