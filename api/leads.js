const { corsHeaders, getErrorResponse, handleOptions, HttpError, json, readJsonBody, sendPushNotification, supabaseRequest } = require("./_utils");

const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_PRIORITIES = new Set(["Normal", "Urgente", "Solo cotización", "Alto valor", "Falta pago", "Falta documento"]);
const ALLOWED_LEGACY_STATUSES = new Set(["Nuevo"]);
const ALLOWED_SERVICES = new Set([
  "Asesoría académica",
  "Servicios legales civiles",
  "Redacción profesional",
  "Trámites y registros",
  "Digital y tecnología",
  "Emprendimiento y finanzas"
]);
const ALLOWED_FIELDS = new Set([
  "name",
  "phone",
  "service",
  "priority",
  "message",
  "note",
  "organization_site",
  // Accepted temporarily so already-cached versions of site.js keep working during rollout.
  "status",
  "value",
  "owner",
  "next_follow_up",
  "history"
]);

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isStringWithin = (value, maxLength, { required = false } = {}) => {
  if (value === undefined || value === null) {
    return !required;
  }
  if (typeof value !== "string") {
    return false;
  }
  const length = value.trim().length;
  return required ? length > 0 && length <= maxLength : length <= maxLength;
};
const cleanText = (value) => String(value || "").trim();

const validateLeadInput = (body) => {
  if (!isPlainObject(body) || Object.keys(body).some((key) => !ALLOWED_FIELDS.has(key))) {
    throw new HttpError(400, "Los datos de la solicitud no son válidos.", "INVALID_LEAD_FIELDS");
  }

  const messageValue = body.message ?? body.note ?? "";
  if (
    !isStringWithin(body.name, 120, { required: true }) ||
    !isStringWithin(body.phone, 40, { required: true }) ||
    !isStringWithin(body.service, 120, { required: true }) ||
    !isStringWithin(body.priority, 40) ||
    !isStringWithin(body.message, 1200) ||
    !isStringWithin(body.note, 1200) ||
    !isStringWithin(body.organization_site, 200)
  ) {
    throw new HttpError(400, "Los datos de la solicitud no son válidos.", "INVALID_LEAD_VALUES");
  }

  const legacyFieldsAreValid =
    (body.status === undefined || (typeof body.status === "string" && ALLOWED_LEGACY_STATUSES.has(body.status.trim()))) &&
    (body.value === undefined || body.value === 0) &&
    (body.owner === undefined || (typeof body.owner === "string" && body.owner.trim() === "Sitio web")) &&
    (body.next_follow_up === undefined ||
      (typeof body.next_follow_up === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.next_follow_up))) &&
    (body.history === undefined || (Array.isArray(body.history) && body.history.length <= 10));
  if (!legacyFieldsAreValid) {
    throw new HttpError(400, "Los datos de la solicitud no son válidos.", "INVALID_LEAD_LEGACY_FIELDS");
  }

  const phone = cleanText(body.phone);
  const digitCount = (phone.match(/\d/g) || []).length;
  if (digitCount < 7 || !/^[+\d\s().-]+$/.test(phone)) {
    throw new HttpError(400, "Los datos de la solicitud no son válidos.", "INVALID_PHONE");
  }

  const service = cleanText(body.service);
  const priority = cleanText(body.priority) || "Normal";
  if (!ALLOWED_SERVICES.has(service) || !ALLOWED_PRIORITIES.has(priority)) {
    throw new HttpError(400, "Los datos de la solicitud no son válidos.", "INVALID_LEAD_ENUM");
  }

  return {
    name: cleanText(body.name),
    phone,
    service,
    priority,
    message: cleanText(messageValue),
    honeypot: cleanText(body.organization_site)
  };
};

const isInvalidPushTokenError = (error) => /UNREGISTERED|NotRegistered|registration-token-not-registered|Requested entity was not found|INVALID_ARGUMENT/i.test(error.message);

const dedupeTokens = (tokens) => {
  const seen = new Set();
  return tokens.filter((item) => {
    const key = String(item.device_key || item.user_agent || item.token || "").trim();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const notifyAdmins = async (lead) => {
  const tokens = dedupeTokens(await supabaseRequest("/rest/v1/push_tokens?select=token,user_agent,updated_at&order=updated_at.desc"));
  console.log("Lead notification tokens:", tokens.length);
  const leadUrl = lead.id ? `/crm?lead=${encodeURIComponent(lead.id)}` : "/crm";
  const notificationId = lead.id ? `lead-${lead.id}` : `lead-${lead.name}-${lead.phone}-${lead.service}`;
  const results = await Promise.allSettled(
    tokens.map((item) =>
      sendPushNotification({
        token: item.token,
        title: "Nueva solicitud DIACA",
        body: `${lead.name} solicitó ${lead.service}`,
        url: leadUrl,
        notificationId
      })
    )
  );
  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failed = results.length - sent;
  const failures = results
    .map((result, index) => ({ result, token: tokens[index]?.token }))
    .filter((item) => item.token && item.result.status === "rejected");
  console.log("Lead notification results:", {
    sent,
    failed,
    failureMessages: failures.map((item) => String(item.result.reason?.message || item.result.reason).slice(0, 220))
  });

  await Promise.allSettled(
    failures
      .filter((item) => isInvalidPushTokenError(item.result.reason))
      .map((item) => supabaseRequest(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(item.token)}`, { method: "DELETE" }))
  );

  return { tokens: tokens.length, sent, failed };
};

module.exports = async (req, res) => {
  const headers = corsHeaders(req);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" }, { ...headers, Allow: "POST, OPTIONS" });
  }

  try {
    const body = await readJsonBody(req, { maxBytes: MAX_BODY_BYTES });
    const input = validateLeadInput(body);
    if (input.honeypot) {
      return json(res, 201, { ok: true }, headers);
    }

    const today = new Date().toISOString().slice(0, 10);
    const lead = {
      name: input.name,
      phone: input.phone,
      service: input.service,
      status: "Nuevo",
      priority: input.priority,
      value: 0,
      owner: "Sitio web",
      note: input.message,
      next_follow_up: today,
      history: [
        {
          id: `web-${Date.now()}`,
          date: today,
          owner: "Sitio web",
          note: input.message
        }
      ]
    };

    const rows = await supabaseRequest("/rest/v1/leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(lead)
    });

    const savedLead = rows?.[0] || lead;

    try {
      const push = await notifyAdmins(savedLead);
      console.log("Lead notification summary:", push);
    } catch (error) {
      console.error("Notification error:", error.message);
    }

    return json(res, 201, { ok: true }, headers);
  } catch (error) {
    console.error("lead submit error:", error.message);
    const response = getErrorResponse(error, "No se pudo procesar la solicitud.");
    return json(res, response.status, { error: response.message }, headers);
  }
};
