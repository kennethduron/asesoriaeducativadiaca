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
const pipelinePreviewLimit = 4;
const expandedPipelineColumns = new Set();
let foregroundMessageHandlerAttached = false;
let leadWatchTimer = null;
let pushTokenRefreshTimer = null;
let pushTokenRefreshPromise = null;
const knownLeadIds = new Set();

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
      owner: "Equipo DIACA",
      note: "CV y carta de presentación.",
      nextFollowUp: "2026-05-02",
      createdAt: "2026-04-25",
      history: [
        {
          id: createId(),
          date: "2026-04-25",
          owner: "Equipo DIACA",
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
      owner: "Equipo DIACA",
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
      owner: "Equipo DIACA",
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
      owner: "Equipo DIACA",
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
const pushSyncKey = "diaca-crm-push-last-sync";
const crmConfig = window.DIACA_CONFIG || {};
const backendUrl = String(crmConfig.backendUrl || "https://asesoriaeducativadiaca-bih6.vercel.app").replace(/\/$/, "");
const supabaseUrl = String(crmConfig.supabaseUrl || "").replace(/\/$/, "");
const supabaseAnonKey = crmConfig.supabaseAnonKey || "";
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);
let state = loadState();
let activeLeadId = null;
let remoteSession = null;
let sessionRemembered = false;
let sessionRefreshTimer = null;
let pageLoaderDepth = 0;
let pageLoaderTimer = null;

const crmViewTitles = {
  dashboard: "Panel general",
  leads: "Prospectos",
  clients: "Clientes",
  cases: "Casos y entregas",
  tasks: "Tareas",
  templates: "Plantillas"
};

function showPageLoader(title = "Cargando CRM", text = "Preparando la informacion.", delay = 180) {
  const loader = document.querySelector("#pageLoader");
  if (!loader) {
    return () => {};
  }

  pageLoaderDepth += 1;
  document.querySelector("#pageLoaderTitle").textContent = title;
  document.querySelector("#pageLoaderText").textContent = text;
  loader.setAttribute("aria-busy", "true");

  window.clearTimeout(pageLoaderTimer);
  pageLoaderTimer = window.setTimeout(() => {
    if (pageLoaderDepth > 0) {
      loader.classList.remove("hidden");
    }
  }, delay);

  return () => {
    pageLoaderDepth = Math.max(0, pageLoaderDepth - 1);
    if (pageLoaderDepth === 0) {
      window.clearTimeout(pageLoaderTimer);
      loader.classList.add("hidden");
      loader.setAttribute("aria-busy", "false");
    }
  };
}

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
    owner: lead.owner || "Equipo DIACA",
    note: lead.note || "",
    nextFollowUp: lead.nextFollowUp || lead.createdAt || todayISO(),
    createdAt: lead.createdAt || todayISO(),
    history: Array.isArray(lead.history)
      ? lead.history
      : lead.note
        ? [{ id: createId(), date: lead.createdAt || todayISO(), owner: lead.owner || "Equipo DIACA", note: lead.note }]
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
    owner: task.owner || "Equipo DIACA",
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

  const requestOptions = {
    method: options.method || "GET",
    headers: supabaseHeaders(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  let response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, requestOptions);

  if ((response.status === 401 || response.status === 403) && remoteSession?.refreshToken) {
    remoteSession = await refreshSupabaseSession(remoteSession);
    setSession(remoteSession, sessionRemembered);
    response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
      ...requestOptions,
      headers: supabaseHeaders(options.headers)
    });
  }

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

function scheduleSessionRefresh() {
  window.clearInterval(sessionRefreshTimer);
  if (!hasSupabase || !remoteSession?.refreshToken) {
    return;
  }

  sessionRefreshTimer = window.setInterval(() => {
    ensureFreshSession().catch((error) => {
      console.info("No se pudo renovar la sesion automaticamente.", error.message);
    });
  }, 5 * 60 * 1000);
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

async function getCurrentAdminProfile() {
  if (!hasSupabase || !remoteSession?.accessToken) {
    return null;
  }

  let rows;
  try {
    rows = await supabaseRequest("crm_admins", {
      query: `email=eq.${encodeURIComponent(remoteSession.email)}&select=email,username,must_change_password&limit=1`
    });
  } catch (error) {
    if (/must_change_password|schema cache|column/i.test(error.message)) {
      console.info("La columna must_change_password aun no existe en Supabase.");
      return null;
    }
    throw error;
  }

  return rows?.[0] || null;
}

async function updateSupabasePassword(newPassword) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    throw new Error("No hay una sesion valida para cambiar la contrasena.");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${remoteSession.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password: newPassword })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.msg || data.error_description || "No se pudo cambiar la contrasena.");
  }
}

async function markPasswordChanged() {
  if (backendUrl && remoteSession?.accessToken) {
    const response = await fetch(`${backendUrl}/api/password-changed`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${remoteSession.accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      return;
    }

    if (![404, 405].includes(response.status)) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "No se pudo confirmar el cambio de contrasena.");
    }
  }

  await supabaseRequest("crm_admins", {
    method: "PATCH",
    query: `email=eq.${encodeURIComponent(remoteSession.email)}`,
    headers: { Prefer: "return=minimal" },
    body: {
      must_change_password: false,
      password_changed_at: new Date().toISOString()
    }
  });
}

function requestPasswordChange() {
  const modal = document.querySelector("#forcePasswordModal");
  const form = document.querySelector("#forcePasswordForm");
  const error = document.querySelector("#forcePasswordError");
  const logoutButton = document.querySelector("#forcePasswordLogout");

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      form.removeEventListener("submit", submit);
      logoutButton.removeEventListener("click", logout);
      modal.removeEventListener("cancel", blockCancel);
    };

    const blockCancel = (event) => {
      event.preventDefault();
    };

    const logout = () => {
      cleanup();
      modal.close();
      reject(new Error("Cambio de contrasena cancelado."));
    };

    const submit = async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const newPassword = String(formData.get("newPassword") || "");
      const confirmPassword = String(formData.get("confirmPassword") || "");
      const submitButton = form.querySelector('button[type="submit"]');

      if (newPassword.length < 8) {
        error.textContent = "La contrasena debe tener al menos 8 caracteres.";
        return;
      }

      if (newPassword !== confirmPassword) {
        error.textContent = "Las contrasenas no coinciden.";
        return;
      }

      submitButton.disabled = true;
      error.textContent = "";
      const hideLoader = showPageLoader("Guardando contraseña", "Actualizando la seguridad de la cuenta.");

      try {
        try {
          await updateSupabasePassword(newPassword);
        } catch (updateError) {
          if (!/different from the old password|different from old password|same password/i.test(updateError.message)) {
            throw updateError;
          }
        }
        await markPasswordChanged();
        remoteSession = { ...remoteSession, mustChangePassword: false };
        cleanup();
        form.reset();
        modal.close();
        resolve();
      } catch (passwordError) {
        error.textContent = passwordError.message || "No se pudo guardar la contrasena.";
      } finally {
        submitButton.disabled = false;
        hideLoader();
      }
    };

    form.reset();
    error.textContent = "";
    form.addEventListener("submit", submit);
    logoutButton.addEventListener("click", logout);
    modal.addEventListener("cancel", blockCancel);
    modal.showModal();
  });
}

async function enforcePasswordChangeIfNeeded() {
  const profile = await getCurrentAdminProfile();
  if (!profile?.must_change_password) {
    return;
  }

  document.querySelector("#authScreen").classList.add("hidden");
  document.querySelector("#crmApp").classList.add("hidden");
  await requestPasswordChange();
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

function rememberKnownLeads() {
  knownLeadIds.clear();
  state.leads.forEach((lead) => {
    if (lead.id) {
      knownLeadIds.add(lead.id);
    }
  });
}

async function fetchLatestLeads(limit = 8) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    return [];
  }

  const rows = await supabaseRequest("leads", {
    query: `select=*&order=created_at.desc&limit=${limit}`
  });

  return rows.map(leadFromDb);
}

async function checkForNewRemoteLeads({ notify = true } = {}) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    return;
  }

  const latestLeads = await fetchLatestLeads();
  const newLeads = latestLeads.filter((lead) => lead.id && !knownLeadIds.has(lead.id));
  if (!newLeads.length) {
    return;
  }

  newLeads
    .slice()
    .reverse()
    .forEach((lead) => {
      knownLeadIds.add(lead.id);
      if (!state.leads.some((item) => item.id === lead.id)) {
        state.leads.unshift(lead);
      }
    });

  localStorage.setItem(storageKey, JSON.stringify(state));
  renderAll();

  if (notify) {
    const newestLead = newLeads[0];
    const body =
      newLeads.length === 1
        ? `${newestLead.name} solicito ${newestLead.service}`
        : `${newLeads.length} solicitudes nuevas en DIACA`;
    showCrmNotification("Nueva solicitud DIACA", body, newestLead.id ? `/crm.html?lead=${encodeURIComponent(newestLead.id)}` : "/crm.html").catch(() => {});
  }
}

function startLeadWatch() {
  window.clearInterval(leadWatchTimer);
  if (!hasSupabase || !remoteSession?.accessToken) {
    return;
  }

  rememberKnownLeads();
  leadWatchTimer = window.setInterval(() => {
    checkForNewRemoteLeads().catch((error) => {
      console.info("No se pudo revisar nuevas solicitudes.", error.message);
    });
  }, 7000);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    checkForNewRemoteLeads().catch(() => {});
    refreshGrantedNotifications({ minAgeMs: 10 * 60 * 1000 }).catch((error) => {
      console.info("No se pudo actualizar el dispositivo al volver al CRM.", error.message);
    });
  }
});

window.addEventListener("focus", () => {
  checkForNewRemoteLeads().catch(() => {});
  refreshGrantedNotifications({ minAgeMs: 10 * 60 * 1000 }).catch((error) => {
    console.info("No se pudo actualizar el dispositivo al enfocar el CRM.", error.message);
  });
});

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

async function deleteLeadRemote(leadId) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return;
  }

  await supabaseRequest("leads", {
    method: "DELETE",
    query: `id=eq.${encodeURIComponent(leadId)}`
  });
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
      userAgent: navigator.userAgent,
      test: true
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Tu sesión venció. Inicia sesión otra vez y vuelve a activar la campana.");
    }

    if (response.status === 403) {
      throw new Error("Tu correo no está autorizado como admin en Supabase.");
    }

    throw new Error(data.error || "No se pudo guardar el dispositivo. Revisa la tabla push_tokens y las variables de Vercel.");
  }

  return response.json().catch(() => ({ ok: true }));
}

async function syncPushTokenRemote(token) {
  if (!hasSupabase || !remoteSession?.accessToken || !backendUrl) {
    return null;
  }

  await ensureFreshSession();

  const response = await fetch(`${backendUrl}/api/push-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${remoteSession.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      userAgent: navigator.userAgent,
      test: false
    })
  });

  if (!response.ok && response.status === 401) {
    throw new Error("Tu sesion vencio. Inicia sesion otra vez para reactivar notificaciones.");
  }

  return response.ok ? response.json().catch(() => ({ ok: true })) : null;
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

async function deleteTaskRemote(taskId) {
  if (!hasSupabase || !remoteSession?.accessToken) {
    saveState();
    return;
  }

  await supabaseRequest("tasks", {
    method: "DELETE",
    query: `id=eq.${encodeURIComponent(taskId)}`
  });
}

async function notifyTaskRemote(task) {
  if (!hasSupabase || !remoteSession?.accessToken || !backendUrl) {
    return null;
  }

  await ensureFreshSession();

  const response = await fetch(`${backendUrl}/api/task-notify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${remoteSession.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: task.title,
      due: task.due,
      owner: task.owner
    })
  });

  return response.ok ? response.json().catch(() => ({ ok: true })) : null;
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
  const otherStore = remember ? sessionStorage : localStorage;
  store.setItem(sessionKey, payload);
  otherStore.removeItem(sessionKey);
  sessionRemembered = remember;
}

function clearSession() {
  window.clearInterval(sessionRefreshTimer);
  window.clearInterval(leadWatchTimer);
  window.clearInterval(pushTokenRefreshTimer);
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
}

async function showApp() {
  const hideLoader = showPageLoader("Cargando CRM", "Sincronizando prospectos, tareas y clientes.");
  document.querySelector("#authScreen").classList.add("hidden");
  document.querySelector("#crmApp").classList.remove("hidden");
  document.querySelector("#userPill").textContent = remoteSession?.name || demoUser.name;
  try {
    await ensureFreshSession();
    scheduleSessionRefresh();
    state = await loadRemoteState();
    localStorage.setItem(storageKey, JSON.stringify(state));
    rememberKnownLeads();
    startLeadWatch();
  } catch (error) {
    if (/JWT expired|sesión venció|Unauthorized/i.test(error.message)) {
      alert("No se pudo renovar la sesion en este momento. El CRM seguira abierto; si una accion falla, intenta recargar.");
    } else {
      alert(`No se pudo cargar Supabase: ${error.message}`);
    }
  }
  renderAll();
  openRequestedLeadFromUrl();
  refreshGrantedNotifications({ force: true }).catch((error) => {
    console.info("No se pudo refrescar el token de notificaciones.", error.message);
  });
  schedulePushTokenRefresh();
  hideLoader();
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

function showConfirmDialog({ eyebrow = "Confirmacion", title = "Confirmar accion", message = "Revisa esta accion antes de continuar.", confirmLabel = "Confirmar" }) {
  const modal = document.querySelector("#confirmModal");
  const acceptButton = document.querySelector("#confirmAccept");
  const cancelButton = document.querySelector("#confirmCancel");
  document.querySelector("#confirmEyebrow").textContent = eyebrow;
  document.querySelector("#confirmTitle").textContent = title;
  document.querySelector("#confirmMessage").textContent = message;
  acceptButton.textContent = confirmLabel;

  return new Promise((resolve) => {
    const close = (value) => {
      modal.close();
      acceptButton.removeEventListener("click", accept);
      cancelButton.removeEventListener("click", cancel);
      modal.removeEventListener("cancel", cancel);
      resolve(value);
    };
    const accept = () => close(true);
    const cancel = () => close(false);

    acceptButton.addEventListener("click", accept);
    cancelButton.addEventListener("click", cancel);
    modal.addEventListener("cancel", cancel);
    modal.showModal();
  });
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-field")?.querySelector("input");
      if (!input) {
        return;
      }

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.classList.toggle("is-visible", shouldShow);
      button.setAttribute("aria-label", shouldShow ? "Ocultar contraseña" : "Mostrar contraseña");
      button.setAttribute("title", shouldShow ? "Ocultar contraseña" : "Mostrar contraseña");
    });
  });
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
      await enforcePasswordChangeIfNeeded();
      await showApp();
    } catch (error) {
      console.info("No se pudo restaurar la sesion automaticamente.", error.message);
      remoteSession = null;
      clearSession();
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
    const hideLoader = showPageLoader("Entrando al CRM", "Validando usuario y cargando el panel.");

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
      await enforcePasswordChangeIfNeeded();
      setSession(remoteSession, remember);
      await showApp();
    } catch (loginError) {
      remoteSession = null;
      clearSession();
      showLogin();
      error.textContent = loginError.message || "No se pudo iniciar sesión.";
    } finally {
      hideLoader();
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
      const isExpanded = expandedPipelineColumns.has(status);
      const visibleLeads = isExpanded ? leads : leads.slice(0, pipelinePreviewLimit);
      const hiddenCount = Math.max(leads.length - visibleLeads.length, 0);
      return `
        <div class="pipeline-column">
          <h4>${status} (${leads.length})</h4>
          ${visibleLeads
            .map(
              (lead) => `
                <article class="lead-chip">
                  <button class="lead-chip-main" type="button" data-open-lead="${lead.id}">
                    <strong>${escapeHtml(lead.name)}</strong>
                    <span>${escapeHtml(lead.service)} - ${currency.format(lead.value)}</span>
                    <em>${escapeHtml(lead.priority)}</em>
                  </button>
                  <button class="chip-delete-button" type="button" data-delete-lead="${lead.id}" aria-label="Eliminar solicitud de ${escapeHtml(lead.name)}" title="Eliminar solicitud">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M6 7l1 14h10l1-14" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </article>
              `
            )
            .join("")}
          ${
            leads.length > pipelinePreviewLimit
              ? `<button class="pipeline-more-button" type="button" data-toggle-pipeline="${escapeHtml(status)}">
                  ${isExpanded ? "Ver menos" : `Ver ${hiddenCount} mas`}
                </button>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  document.querySelector("#pipelineTotal").textContent = `${state.leads.length} oportunidades`;
}

function renderTasks() {
  const today = todayISO();
  const todayTasks = state.tasks.filter((task) => task.due <= today && !task.done);
  const activeTasks = state.tasks.filter((task) => !task.done);
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
  document.querySelector("#allTasks").innerHTML = renderTaskItems(activeTasks, true);
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
                  }</button>
                  <button class="chip-delete-button task-delete-button" type="button" data-delete-task="${task.id}" aria-label="Eliminar tarea ${escapeHtml(task.title)}" title="Eliminar tarea">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M6 7l1 14h10l1-14" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>`
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

function setActiveView(viewName) {
  const button = document.querySelector(`.nav-tab[data-view="${viewName}"]`);
  const view = document.querySelector(`#${viewName}View`);
  if (!button || !view) {
    return;
  }

  document.querySelectorAll(".nav-tab[data-view]").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".crm-view").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  view.classList.add("active");
  document.querySelector("#crmViewTitle").textContent = crmViewTitles[viewName] || "CRM";
  closeCrmMenu();
}

function setupNavigation() {
  document.querySelectorAll(".nav-tab[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveView(button.dataset.view);
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

    const hideLoader = showPageLoader("Guardando prospecto", "Registrando la solicitud en el CRM.");
    try {
      const savedLead = await saveLeadRemote(lead);
      state.leads.unshift(savedLead);
      saveState();
      renderAll();
      form.reset();
      modal.close();
    } finally {
      hideLoader();
    }
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
  document.querySelector("#detailValue").value = Number(lead.value || 0);
  document.querySelector("#detailHistoryNote").value = "";
  document.querySelector("#leadDetailModal").showModal();
}

function getRequestedLeadId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lead") || "";
}

function openRequestedLeadFromUrl() {
  const leadId = getRequestedLeadId();
  if (!leadId) {
    return;
  }

  setActiveView("leads");
  openLeadDetail(leadId);
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
    lead.value = Math.max(0, Number(formData.get("value") || 0));

    if (note) {
      lead.history.push({
        id: createId(),
        date: todayISO(),
        owner: lead.owner,
        note
      });
      lead.note = note;
    }

    const hideLoader = showPageLoader("Guardando seguimiento", "Actualizando la ficha del prospecto.");
    try {
      const savedLead = await updateLeadRemote(lead);
      const savedIndex = state.leads.findIndex((item) => item.id === savedLead.id);
      if (savedIndex >= 0) {
        state.leads[savedIndex] = savedLead;
      }
      saveState();
      renderAll();
      modal.close();
    } finally {
      hideLoader();
    }
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

    const deleteTaskButton = event.target.closest?.("[data-delete-task]");
    const deleteTaskId = deleteTaskButton?.dataset.deleteTask;
    if (deleteTaskId) {
      const task = state.tasks.find((item) => item.id === deleteTaskId);
      if (!task) {
        return;
      }

      const confirmed = await showConfirmDialog({
        eyebrow: "Tarea",
        title: "Eliminar tarea",
        message: `Vas a eliminar la tarea "${task.title}". Esta accion no se puede deshacer.`,
        confirmLabel: "Eliminar"
      });
      if (!confirmed) {
        return;
      }

      const hideLoader = showPageLoader("Eliminando tarea", "Actualizando la agenda.");
      try {
        await deleteTaskRemote(deleteTaskId);
        state.tasks = state.tasks.filter((item) => item.id !== deleteTaskId);
        saveState();
        renderAll();
      } finally {
        hideLoader();
      }
      return;
    }

    const togglePipelineButton = event.target.closest?.("[data-toggle-pipeline]");
    const togglePipelineStatus = togglePipelineButton?.dataset.togglePipeline;
    if (togglePipelineStatus) {
      if (expandedPipelineColumns.has(togglePipelineStatus)) {
        expandedPipelineColumns.delete(togglePipelineStatus);
      } else {
        expandedPipelineColumns.add(togglePipelineStatus);
      }
      renderPipeline();
      return;
    }

    const deleteButton = event.target.closest?.("[data-delete-lead]");
    const deleteLeadId = deleteButton?.dataset.deleteLead;
    if (deleteLeadId) {
      const lead = state.leads.find((item) => item.id === deleteLeadId);
      if (!lead) {
        return;
      }

      const confirmed = await showConfirmDialog({
        eyebrow: "Solicitud",
        title: "Eliminar solicitud",
        message: `Vas a eliminar la solicitud de ${lead.name}. Esta accion no se puede deshacer.`,
        confirmLabel: "Eliminar"
      });
      if (!confirmed) {
        return;
      }

      const hideLoader = showPageLoader("Eliminando solicitud", "Actualizando prospectos.");
      try {
        await deleteLeadRemote(deleteLeadId);
        state.leads = state.leads.filter((item) => item.id !== deleteLeadId);
        saveState();
        renderAll();
      } finally {
        hideLoader();
      }
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
    const form = event.currentTarget;
    const error = document.querySelector("#taskFormError");
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const task = {
      id: createId(),
      title: String(formData.get("title") || "").trim(),
      due: String(formData.get("due") || todayISO()),
      owner: String(formData.get("owner") || "Equipo DIACA"),
      done: false
    };

    if (!task.title) {
      error.textContent = "Escribe el nombre de la tarea.";
      return;
    }

    error.textContent = "";
    submitButton.disabled = true;

    state.tasks.unshift(task);
    saveState();
    form.reset();
    renderAll();

    try {
      const savedTask = await saveTaskRemote(task);
      const savedIndex = state.tasks.findIndex((item) => item.id === task.id);
      if (savedIndex >= 0) {
        state.tasks[savedIndex] = savedTask;
      }
      saveState();
      renderAll();
      if (task.due <= todayISO()) {
        await notifyTaskRemote(savedTask);
      }
    } catch (taskError) {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState();
      renderAll();
      error.textContent = taskError.message || "No se pudo guardar la tarea.";
    } finally {
      submitButton.disabled = false;
    }
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

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

async function getPushSupportMessage() {
  if (!("Notification" in window)) {
    return "Este navegador no permite notificaciones web. En Android usa Chrome o Edge. En iPhone abre Safari y agrega el CRM a la pantalla de inicio.";
  }

  if (!("serviceWorker" in navigator)) {
    return "Este navegador no permite service workers. Si estas dentro de Instagram, Facebook, TikTok o WhatsApp, abre el CRM en Chrome, Edge o Safari.";
  }

  if (isIosDevice() && !isStandaloneApp()) {
    return "En iPhone, primero abre el CRM en Safari, toca Compartir y elige Agregar a pantalla de inicio. Luego abre DIACA desde ese icono y activa la campana.";
  }

  if (!window.firebase?.messaging) {
    return "No se cargo Firebase Messaging. Revisa tu conexion e intenta recargar el CRM.";
  }

  if (typeof firebase.messaging.isSupported === "function") {
    const supported = await firebase.messaging.isSupported();
    if (!supported) {
      return "Este navegador no soporta Firebase Cloud Messaging. En Android usa Chrome o Edge. En iPhone usa Safari desde el icono agregado a pantalla de inicio.";
    }
  }

  return "";
}

async function showCrmNotification(title, body, url = "/crm.html") {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const targetUrl = new URL(url, window.location.origin).toString();
  const options = {
    body,
    icon: "/assets/favicon.svg",
    badge: "/assets/favicon.svg",
    tag: `diaca-crm-${Date.now()}`,
    renotify: true,
    timestamp: Date.now(),
    vibrate: [120, 60, 120],
    requireInteraction: true,
    data: { url: targetUrl }
  };

  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }

  const notification = new Notification(title, options);
  notification.onclick = () => {
    window.focus();
    window.location.assign(targetUrl);
    notification.close();
  };
}

function setupForegroundMessageHandler(messaging) {
  if (foregroundMessageHandlerAttached || !messaging?.onMessage) {
    return;
  }

  messaging.onMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || "DIACA CRM";
    const body = payload.notification?.body || payload.data?.body || "Tienes una nueva solicitud pendiente.";
    const url = payload.data?.url || payload.notification?.data?.url || "/crm.html";
    showCrmNotification(title, body, url).catch(() => {});
    checkForNewRemoteLeads({ notify: false }).catch(() => {});
  });
  foregroundMessageHandlerAttached = true;
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

      const supportMessage = await getPushSupportMessage();
      if (supportMessage) {
        alert(supportMessage);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permiso de notificaciones denegado. Actívalo en la configuración del navegador.");
        return;
      }

      const hideLoader = showPageLoader("Activando notificaciones", "Registrando este dispositivo.");
      const swRegistration = await registerServiceWorker();
      try {
        if (!swRegistration) {
          throw new Error("No se pudo registrar el service worker.");
        }

        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }

        const messaging = firebase.messaging();
        setupForegroundMessageHandler(messaging);

        let token = await messaging.getToken({
          vapidKey: publicVapidKey,
          serviceWorkerRegistration: swRegistration
        });

        if (!token) {
          throw new Error("Firebase no devolvió token para este dispositivo.");
        }

        let result;
        try {
          result = await savePushTokenRemote(token);
        } catch (error) {
          if (/token|rechazo|UNREGISTERED|NotRegistered|409/i.test(error.message)) {
            await messaging.deleteToken().catch(() => {});
            token = await messaging.getToken({
              vapidKey: publicVapidKey,
              serviceWorkerRegistration: swRegistration
            });
            if (!token) {
              throw error;
            }
            result = await savePushTokenRemote(token);
          } else {
            throw error;
          }
        }
        setButtonReady();
        localStorage.setItem(pushSyncKey, String(Date.now()));
        alert(
          result?.testSent
            ? "Listo. Enviamos una notificacion de prueba a este dispositivo."
            : "Listo. Este dispositivo ya puede recibir notificaciones."
        );
      } finally {
        hideLoader();
      }
    } catch (error) {
      const iosHelp = isIosDevice()
        ? " En iPhone, confirma que abriste DIACA desde el icono de la pantalla de inicio, no desde una pestana normal de Safari."
        : "";
      alert(`${error.message || "No se pudieron activar las notificaciones."}${iosHelp}`);
    }
  });
}

function schedulePushTokenRefresh() {
  window.clearInterval(pushTokenRefreshTimer);
  if (!hasSupabase || !remoteSession?.accessToken) {
    return;
  }

  pushTokenRefreshTimer = window.setInterval(() => {
    refreshGrantedNotifications({ minAgeMs: 60 * 60 * 1000 }).catch((error) => {
      console.info("No se pudo mantener actualizado el dispositivo.", error.message);
    });
  }, 60 * 60 * 1000);
}

async function refreshGrantedNotifications({ force = false, minAgeMs = 6 * 60 * 60 * 1000 } = {}) {
  if (pushTokenRefreshPromise) {
    return pushTokenRefreshPromise;
  }

  const lastSync = Number(localStorage.getItem(pushSyncKey) || 0);
  if (!force && lastSync && Date.now() - lastSync < minAgeMs) {
    return null;
  }

  pushTokenRefreshPromise = refreshGrantedNotificationsOnce()
    .finally(() => {
      pushTokenRefreshPromise = null;
    });

  return pushTokenRefreshPromise;
}

async function refreshGrantedNotificationsOnce() {
  const firebaseConfig = crmConfig.firebase || {};
  const publicVapidKey = firebaseConfig.publicVapidKey || firebaseConfig.vapidKey || "";
  if (!publicVapidKey || !("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator) || !window.firebase?.messaging) {
    return;
  }

  if (await getPushSupportMessage()) {
    return;
  }

  const swRegistration = await registerServiceWorker();
  if (!swRegistration) {
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();
  setupForegroundMessageHandler(messaging);

  const token = await messaging.getToken({
    vapidKey: publicVapidKey,
    serviceWorkerRegistration: swRegistration
  });

  if (token) {
    await syncPushTokenRemote(token);
    localStorage.setItem(pushSyncKey, String(Date.now()));
  }
}

setupPasswordToggles();
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
