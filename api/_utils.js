const crypto = require("crypto");

class HttpError extends Error {
  constructor(statusCode, publicMessage, code) {
    super(code || publicMessage);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.code = code;
  }
}

const json = (res, status, body, extraHeaders = {}) => {
  res.statusCode = status;
  Object.entries({
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  }).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
};

const getAllowedOrigins = () =>
  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (req) => {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin"
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
};

const handleOptions = (req, res) => {
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.writeHead(204, corsHeaders(req));
  res.end();
  return true;
};

const readJsonBody = async (req, { maxBytes = 64 * 1024 } = {}) => {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "La solicitud es demasiado grande.", "PAYLOAD_TOO_LARGE");
  }

  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new HttpError(413, "La solicitud es demasiado grande.", "PAYLOAD_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "La solicitud no es válida.", "INVALID_JSON");
  }
};

const getErrorResponse = (error, fallbackMessage = "No se pudo procesar la solicitud.") => {
  if (error instanceof HttpError) {
    return { status: error.statusCode, message: error.publicMessage };
  }

  if (error?.message === "Unauthorized") {
    return { status: 401, message: "Unauthorized" };
  }

  if (error?.message === "Forbidden") {
    return { status: 403, message: "Forbidden" };
  }

  return { status: 500, message: fallbackMessage };
};

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const getPublicAppUrl = () => {
  const configuredUrl = process.env.PUBLIC_APP_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const allowedOrigins = getAllowedOrigins();
  return (allowedOrigins.find((origin) => origin.includes("web.app")) || allowedOrigins[0] || "").replace(/\/$/, "");
};

const supabaseRequest = async (path, options = {}) => {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Supabase error ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const tableExists = async (tableName) => {
  try {
    await supabaseRequest(`/rest/v1/${tableName}?select=*&limit=1`);
    return true;
  } catch (error) {
    return !/Could not find|schema cache|does not exist|PGRST205|42P01/i.test(error.message);
  }
};

const verifySupabaseUser = async (accessToken) => {
  const supabaseUrl = requiredEnv("SUPABASE_URL").replace(/\/$/, "");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Unauthorized");
  }

  return response.json();
};

const verifyAdmin = async (req) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    throw new Error("Unauthorized");
  }

  const user = await verifySupabaseUser(token);
  const email = String(user.email || "").toLowerCase();
  if (!email) {
    throw new Error("Unauthorized");
  }

  const admins = await supabaseRequest(`/rest/v1/crm_admins?email=eq.${encodeURIComponent(email)}&select=email&limit=1`);
  if (!admins.length) {
    throw new Error("Forbidden");
  }

  return { email };
};

const base64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

let cachedGoogleToken = null;

const getGoogleAccessToken = async () => {
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > Date.now() + 60000) {
    return cachedGoogleToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const clientEmail = requiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const assertion = [
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64url(
      JSON.stringify({
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
      })
    )
  ].join(".");
  const signature = crypto.sign("RSA-SHA256", Buffer.from(assertion), privateKey);
  const jwt = `${assertion}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo autenticar Firebase.");
  }

  const data = await response.json();
  cachedGoogleToken = {
    token: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };

  return cachedGoogleToken.token;
};

const makeNotificationId = (...parts) =>
  crypto
    .createHash("sha256")
    .update(parts.map((part) => String(part || "")).join("|"))
    .digest("hex")
    .slice(0, 32);

const sendPushNotification = async ({ token, title, body, url = "/crm", notificationId }) => {
  const projectId = requiredEnv("FIREBASE_PROJECT_ID");
  const publicAppUrl = getPublicAppUrl();
  const targetUrl = publicAppUrl ? new URL(url, publicAppUrl).toString() : url;
  const notificationData = {
    url: targetUrl,
    title: String(title || "DIACA CRM"),
    body: String(body || "Tienes una nueva solicitud pendiente."),
    notificationId: String(notificationId || makeNotificationId(title, body, targetUrl))
  };
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        token,
        data: notificationData,
        webpush: {
          headers: {
            TTL: "86400",
            Urgency: "high"
          },
          fcm_options: { link: targetUrl }
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "No se pudo enviar la notificación.");
  }

  return response.json();
};

module.exports = {
  corsHeaders,
  getErrorResponse,
  handleOptions,
  HttpError,
  json,
  readJsonBody,
  sendPushNotification,
  supabaseRequest,
  tableExists,
  verifyAdmin
};
