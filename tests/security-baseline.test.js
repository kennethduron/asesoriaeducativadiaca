const { Readable } = require("node:stream");
const { readFile } = require("node:fs/promises");
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ALLOWED_ORIGINS = "https://asesoriaeducativadiaca.com,https://www.asesoriaeducativadiaca.com";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

const leadsHandler = require("../api/leads");

const validLead = {
  name: "Cliente de prueba",
  phone: "+504 9999-0000",
  service: "Asesoría académica",
  priority: "Normal",
  message: "Necesito información.",
  organization_site: ""
};

function createRequest({ body = validLead, rawBody, method = "POST", origin = "https://asesoriaeducativadiaca.com" } = {}) {
  const payload = rawBody ?? JSON.stringify(body);
  const request = Readable.from(method === "GET" ? [] : [Buffer.from(payload)]);
  request.method = method;
  request.headers = {
    origin,
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(payload))
  };
  return request;
}

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: "",
    headers,
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), String(value));
    },
    writeHead(statusCode, nextHeaders = {}) {
      this.statusCode = statusCode;
      Object.entries(nextHeaders).forEach(([name, value]) => this.setHeader(name, value));
    },
    end(payload = "") {
      this.body = String(payload);
    }
  };
}

async function invoke(options) {
  const request = createRequest(options);
  const response = createResponse();
  await leadsHandler(request, response);
  return {
    status: response.statusCode,
    headers: Object.fromEntries(response.headers),
    body: response.body ? JSON.parse(response.body) : null
  };
}

function installSuccessfulSupabaseMock() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/rest/v1/leads")) {
      const savedLead = JSON.parse(options.body);
      return new Response(JSON.stringify([{ ...savedLead, id: "11111111-1111-4111-8111-111111111111" }]), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    }
    if (String(url).includes("/rest/v1/push_tokens")) {
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected test URL: ${url}`);
  };
  return calls;
}

test.afterEach(() => {
  delete global.fetch;
});

test("a legitimate lead is accepted without returning its PII", async () => {
  const calls = installSuccessfulSupabaseMock();
  const result = await invoke();

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(calls.filter((call) => call.url.includes("/rest/v1/leads")).length, 1);
  const insert = calls.find((call) => call.url.includes("/rest/v1/leads"));
  assert.equal(JSON.parse(insert.options.body).priority, "Normal");
});

test("an adversarial priority is rejected before any network request", async () => {
  let fetched = false;
  global.fetch = async () => {
    fetched = true;
    throw new Error("fetch should not run");
  };

  const result = await invoke({ body: { ...validLead, priority: '\"><img src=x onerror=alert(1)>' } });
  assert.equal(result.status, 400);
  assert.equal(fetched, false);
});

test("a payload over 16 KiB is rejected with 413", async () => {
  const result = await invoke({ body: { ...validLead, message: "x".repeat(17 * 1024) } });
  assert.equal(result.status, 413);
  assert.match(result.body.error, /demasiado grande/i);
});

test("a filled honeypot returns a generic success without saving", async () => {
  let fetched = false;
  global.fetch = async () => {
    fetched = true;
    throw new Error("fetch should not run");
  };

  const result = await invoke({ body: { ...validLead, organization_site: "https://spam.example" } });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { ok: true });
  assert.equal(fetched, false);
});

test("GET is rejected with 405 and an Allow header", async () => {
  const result = await invoke({ method: "GET" });
  assert.equal(result.status, 405);
  assert.equal(result.headers.allow, "POST, OPTIONS");
});

test("invalid JSON is rejected with 400 without a stack trace", async () => {
  const result = await invoke({ rawBody: "{invalid" });
  assert.equal(result.status, 400);
  assert.equal("stack" in result.body, false);
});

test("objects are rejected where scalar strings are required", async () => {
  const result = await invoke({ body: { ...validLead, name: { x: "y" } } });
  assert.equal(result.status, 400);
});

test("objects in legacy text aliases are rejected even when message is present", async () => {
  const result = await invoke({ body: { ...validLead, note: { x: "y" } } });
  assert.equal(result.status, 400);
});

test("unknown fields are rejected", async () => {
  const result = await invoke({ body: { ...validLead, unexpected: "value" } });
  assert.equal(result.status, 400);
});

test("CORS permits configured origins and omits ACAO for other origins", async () => {
  const allowed = await invoke({ method: "OPTIONS", origin: "https://asesoriaeducativadiaca.com" });
  const denied = await invoke({ method: "OPTIONS", origin: "https://evil.example" });

  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "https://asesoriaeducativadiaca.com");
  assert.equal(denied.status, 204);
  assert.equal(denied.headers["access-control-allow-origin"], undefined);
});

test("unexpected backend errors are not exposed to the client", async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  global.fetch = async () => new Response('sensitive SQL error from table "leads"', { status: 500 });

  try {
    const result = await invoke();
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: "No se pudo procesar la solicitud." });
    assert.doesNotMatch(JSON.stringify(result.body), /SQL|table|leads/i);
  } finally {
    console.error = originalConsoleError;
  }
});

test("CRM class names are selected from internal maps instead of external values", async () => {
  const source = await readFile(require("node:path").join(__dirname, "..", "js", "crm.js"), "utf8");
  assert.match(source, /function getPriorityClass/);
  assert.match(source, /function getStatusClass/);
  assert.doesNotMatch(source, /priority-\$\{lead\.priority/);
  assert.doesNotMatch(source, /status-\$\{lead\.status/);
  assert.doesNotMatch(source, /status-\$\{client\.status/);
});
