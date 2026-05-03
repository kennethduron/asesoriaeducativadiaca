const { corsHeaders, handleOptions, json, readJsonBody, sendPushNotification, supabaseRequest, verifyAdmin } = require("./_utils");

const isInvalidPushTokenError = (error) =>
  /UNREGISTERED|NotRegistered|registration-token-not-registered|Requested entity was not found|INVALID_ARGUMENT/i.test(error.message);

const cleanText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const notifyTokens = async ({ title, body, url }) => {
  const tokens = await supabaseRequest("/rest/v1/push_tokens?select=token,updated_at&order=updated_at.desc");
  const results = await Promise.allSettled(tokens.map((item) => sendPushNotification({ token: item.token, title, body, url })));
  const sent = results.filter((result) => result.status === "fulfilled").length;
  const failures = results
    .map((result, index) => ({ result, token: tokens[index]?.token }))
    .filter((item) => item.token && item.result.status === "rejected");

  await Promise.allSettled(
    failures
      .filter((item) => isInvalidPushTokenError(item.result.reason))
      .map((item) => supabaseRequest(`/rest/v1/push_tokens?token=eq.${encodeURIComponent(item.token)}`, { method: "DELETE" }))
  );

  return {
    tokens: tokens.length,
    sent,
    failed: tokens.length - sent
  };
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
    await verifyAdmin(req);
    const body = await readJsonBody(req);
    const taskTitle = cleanText(body.title, 160);
    const owner = cleanText(body.owner, 80) || "Equipo DIACA";
    const due = cleanText(body.due, 20);

    if (!taskTitle) {
      return json(res, 400, { error: "Tarea requerida." }, headers);
    }

    const push = await notifyTokens({
      title: "Tarea pendiente DIACA",
      body: due ? `${taskTitle} - ${owner} - vence ${due}` : `${taskTitle} - ${owner}`,
      url: "/crm.html"
    });

    console.log("Task immediate notification summary:", { taskTitle, push });
    return json(res, 200, { ok: true, push }, headers);
  } catch (error) {
    console.error("task-notify error:", error.message);
    const status = error.message === "Unauthorized" ? 401 : error.message === "Forbidden" ? 403 : 500;
    return json(res, status, { error: status === 500 ? `No se pudo notificar la tarea: ${error.message}` : error.message }, headers);
  }
};
