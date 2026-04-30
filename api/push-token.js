const { corsHeaders, handleOptions, json, readJsonBody, supabaseRequest, verifyAdmin } = require("./_utils");

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

    return json(res, 200, { ok: true }, headers);
  } catch (error) {
    const status = error.message === "Unauthorized" ? 401 : error.message === "Forbidden" ? 403 : 500;
    return json(res, status, { error: status === 500 ? "No se pudo guardar el dispositivo." : error.message }, headers);
  }
};
