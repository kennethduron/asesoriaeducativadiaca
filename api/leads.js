const { corsHeaders, handleOptions, json, readJsonBody, sendPushNotification, supabaseRequest } = require("./_utils");

const cleanText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const isInvalidPushTokenError = (error) => /UNREGISTERED|registration-token-not-registered|Requested entity was not found|INVALID_ARGUMENT/i.test(error.message);

const notifyAdmins = async (lead) => {
  const tokens = await supabaseRequest("/rest/v1/push_tokens?select=token");
  const leadUrl = lead.id ? `/crm.html?lead=${encodeURIComponent(lead.id)}` : "/crm.html";
  const results = await Promise.allSettled(
    tokens.map((item) =>
      sendPushNotification({
        token: item.token,
        title: "Nueva solicitud DIACA",
        body: `${lead.name} solicitó ${lead.service}`,
        url: leadUrl
      })
    )
  );

  await Promise.allSettled(
    results
      .map((result, index) => ({ result, token: tokens[index]?.token }))
      .filter((item) => item.token && item.result.status === "rejected" && isInvalidPushTokenError(item.result.reason))
      .map((item) => supabaseRequest(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(item.token)}`, { method: "DELETE" }))
  );
};

module.exports = async (req, res) => {
  const headers = corsHeaders(req);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" }, headers);
  }

  try {
    const body = await readJsonBody(req);
    const today = new Date().toISOString().slice(0, 10);
    const lead = {
      name: cleanText(body.name, 120),
      phone: cleanText(body.phone, 40),
      service: cleanText(body.service, 120),
      status: "Nuevo",
      priority: cleanText(body.priority, 40) || "Normal",
      value: 0,
      owner: "Sitio web",
      note: cleanText(body.note || body.message, 1200),
      next_follow_up: today,
      history: [
        {
          id: `web-${Date.now()}`,
          date: today,
          owner: "Sitio web",
          note: cleanText(body.note || body.message, 1200)
        }
      ]
    };

    if (!lead.name || !lead.phone || !lead.service) {
      return json(res, 400, { error: "Nombre, teléfono y servicio son obligatorios." }, headers);
    }

    const rows = await supabaseRequest("/rest/v1/leads", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(lead)
    });

    const savedLead = rows?.[0] || lead;

    notifyAdmins(savedLead).catch((error) => {
      console.error("Notification error:", error.message);
    });

    return json(res, 201, { ok: true, lead: savedLead }, headers);
  } catch (error) {
    console.error("lead submit error:", error.message);
    return json(res, 500, { error: `No se pudo registrar la solicitud: ${error.message}` }, headers);
  }
};
