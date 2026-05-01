const crypto = require("crypto");

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
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || origin || "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin"
  };
};

const handleOptions = (req, res) => {
  if (req.method !== "OPTIONS") {
    return false;
  }

  res.writeHead(204, corsHeaders(req));
  res.end();
  return true;
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
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

  return response.json();
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

const sendPushNotification = async ({ token, title, body, url = "/crm.html" }) => {
  const projectId = requiredEnv("FIREBASE_PROJECT_ID");
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
        notification: { title, body },
        data: { url },
        webpush: {
          fcm_options: { link: url }
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
  handleOptions,
  json,
  readJsonBody,
  sendPushNotification,
  supabaseRequest,
  tableExists,
  verifyAdmin
};
