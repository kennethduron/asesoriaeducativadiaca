const { corsHeaders, handleOptions, json, readJsonBody, sendPushNotification, supabaseRequest, tableExists, verifyAdmin } = require("./_utils");

const isInvalidPushTokenError = (error) => /UNREGISTERED|registration-token-not-registered|Requested entity was not found|INVALID_ARGUMENT|NotRegistered/i.test(error.message);

module.exports = async (req, res) => {
  const headers = corsHeaders(req);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" }, headers);
  }

  try {
    const admin = await verifyAdmin(req);
    const body = await readJsonBody(req);
    const token = String(body.token || "").trim();

    if (!token) {
      return json(res, 400, { error: "Token requerido." }, headers);
    }

    const hasPushTokens = await tableExists("push_tokens");
    if (!hasPushTokens) {
      return json(res, 500, { error: "Falta crear la tabla push_tokens en Supabase." }, headers);
    }

    await supabaseRequest("/rest/v1/push_tokens?on_conflict=token", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        token,
        user_email: admin.email,
        user_agent: String(body.userAgent || "").slice(0, 400),
        updated_at: new Date().toISOString()
      })
    });

    if (body.test !== false) {
      try {
        await sendPushNotification({
          token,
          title: "Notificaciones DIACA activadas",
          body: "Este celular ya recibira avisos del CRM.",
          url: "/crm.html"
        });
      } catch (error) {
        if (isInvalidPushTokenError(error)) {
          await supabaseRequest(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, { method: "DELETE" });
          return json(res, 409, { error: "Firebase rechazo este token. Cierra DIACA, abre el CRM otra vez desde el icono y vuelve a tocar la campana." }, headers);
        }

        throw error;
      }
    }

    return json(res, 200, { ok: true, testSent: body.test !== false }, headers);
  } catch (error) {
    console.error("push-token error:", error.message);
    const status = error.message === "Unauthorized" ? 401 : error.message === "Forbidden" ? 403 : 500;
    return json(res, status, { error: status === 500 ? `No se pudo guardar el dispositivo: ${error.message}` : error.message }, headers);
  }
};
