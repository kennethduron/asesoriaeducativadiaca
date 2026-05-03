const { json, sendPushNotification, supabaseRequest } = require("./_utils");

const isInvalidPushTokenError = (error) =>
  /UNREGISTERED|NotRegistered|registration-token-not-registered|Requested entity was not found|INVALID_ARGUMENT/i.test(error.message);

const hondurasDate = () => {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
};

const verifyCron = (req) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    throw new Error("Missing CRON_SECRET");
  }

  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    throw new Error("Unauthorized");
  }
};

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
    failed: tokens.length - sent,
    failureMessages: failures.map((item) => String(item.result.reason?.message || item.result.reason).slice(0, 220))
  };
};

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    verifyCron(req);
    const today = hondurasDate();
    const tasks = await supabaseRequest(
      `/rest/v1/tasks?select=id,title,owner,due&done=eq.false&due=lte.${encodeURIComponent(today)}&order=due.asc`
    );

    if (!tasks.length) {
      console.log("Task reminder summary:", { today, tasks: 0, sent: 0 });
      return json(res, 200, { ok: true, today, tasks: 0, push: { tokens: 0, sent: 0, failed: 0 } });
    }

    const title = tasks.length === 1 ? "Tarea pendiente DIACA" : "Tareas pendientes DIACA";
    const firstTask = tasks[0];
    const body = tasks.length === 1 ? `${firstTask.title} - ${firstTask.owner}` : `Tienes ${tasks.length} tareas pendientes o vencidas.`;
    const push = await notifyTokens({ title, body, url: "/crm" });

    console.log("Task reminder summary:", { today, tasks: tasks.length, push });
    return json(res, 200, { ok: true, today, tasks: tasks.length, push });
  } catch (error) {
    console.error("task-reminders error:", error.message);
    const status = error.message === "Unauthorized" ? 401 : 500;
    return json(res, status, { error: status === 401 ? "Unauthorized" : `No se pudieron enviar recordatorios: ${error.message}` });
  }
};
