const { corsHeaders, handleOptions, json, supabaseRequest, verifyAdmin } = require("./_utils");

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
    await supabaseRequest(`/rest/v1/crm_admins?email=eq.${encodeURIComponent(admin.email)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        must_change_password: false,
        password_changed_at: new Date().toISOString()
      })
    });

    return json(res, 200, { ok: true }, headers);
  } catch (error) {
    console.error("password-changed error:", error.message);
    const status = error.message === "Unauthorized" ? 401 : error.message === "Forbidden" ? 403 : 500;
    return json(res, status, { error: status === 500 ? `No se pudo guardar el cambio: ${error.message}` : error.message }, headers);
  }
};
