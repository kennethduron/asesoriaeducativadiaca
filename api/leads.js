const { corsHeaders, handleOptions, json, readJsonBody, sendPushNotification, supabaseRequest } = require("./_utils");

const cleanText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const notifyAdmins = async (lead) => {
  const tokens = await supabaseRequest("/rest/v1/push_tokens?select=token");
  await Promise.allSettled(
    tokens.map((item) =>
      sendPushNotification({
        token: item.token,
        title: "Nueva solicitud DIACA",
        body: `${lead.name} solicitó ${lead.service}`,
        url: "/crm.html"
      })
    )
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

    notifyAdmins(lead).catch((error) => {
      console.error("Notification error:", error.message);
    });

    return json(res, 201, { ok: true, lead: rows?.[0] || null }, headers);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "No se pudo registrar la solicitud." }, headers);
  }
};
