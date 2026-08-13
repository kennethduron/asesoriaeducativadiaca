const { corsHeaders, getErrorResponse, handleOptions, json, supabaseRequest, verifyAdmin } = require("./_utils");

module.exports = async (req, res) => {
  const headers = corsHeaders(req);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" }, { ...headers, Allow: "POST, OPTIONS" });
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
    const response = getErrorResponse(error, "No se pudo guardar el cambio.");
    return json(res, response.status, { error: response.message }, headers);
  }
};
