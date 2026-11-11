import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getServiceSupabase,
  isSupabaseConfigured,
  supabaseDiag,
  withSupabaseHealthDiag,
} from "@/lib/supabase-admin";

const URL = "https://example.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dGVzdA";

const touched = [
  "VERCEL_ENV",
  "T4T_ALLOW_NONPROD_SUPABASE",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

const saved = Object.fromEntries(touched.map((name) => [name, process.env[name]]));

afterEach(() => {
  for (const name of touched) {
    const value = saved[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function withKeys() {
  process.env.SUPABASE_URL = URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.T4T_ALLOW_NONPROD_SUPABASE;
}

test("production with keys uses Supabase", () => {
  withKeys();
  process.env.VERCEL_ENV = "production";
  assert.equal(isSupabaseConfigured(), true);
  assert.equal(typeof getServiceSupabase().from, "function");
});

test("preview with keys stays on the file store", () => {
  withKeys();
  process.env.VERCEL_ENV = "preview";
  assert.equal(isSupabaseConfigured(), false);
  assert.throws(() => getServiceSupabase(), /SUPABASE_NOT_CONFIGURED/);
});

test("development with keys stays on the file store", () => {
  withKeys();
  process.env.VERCEL_ENV = "development";
  assert.equal(isSupabaseConfigured(), false);
  assert.throws(() => getServiceSupabase(), /SUPABASE_NOT_CONFIGURED/);
});

test("unset VERCEL_ENV keeps the current local behavior", () => {
  withKeys();
  delete process.env.VERCEL_ENV;
  assert.equal(isSupabaseConfigured(), true);
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(isSupabaseConfigured(), false);
});

test("preview with T4T_ALLOW_NONPROD_SUPABASE=1 uses Supabase", () => {
  withKeys();
  process.env.VERCEL_ENV = "preview";
  process.env.T4T_ALLOW_NONPROD_SUPABASE = "1";
  assert.equal(isSupabaseConfigured(), true);
  assert.equal(typeof getServiceSupabase().from, "function");
});

test("trim accepts a padded URL and sb_secret_ key", () => {
  const secret = "sb_secret_unit_test_value";
  process.env.VERCEL_ENV = "production";
  process.env.SUPABASE_URL = " https://projref.supabase.co/ \n";
  process.env.SUPABASE_SERVICE_ROLE_KEY = ` \n${secret}\n `;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.T4T_ALLOW_NONPROD_SUPABASE;
  assert.equal(isSupabaseConfigured(), true);
  const diag = supabaseDiag();
  assert.equal(diag.urlHost, "projref.supabase.co");
  assert.equal(diag.keySource, "SERVICE_ROLE");
  assert.equal(diag.keyKind, "sb_secret");
  assert.equal(diag.keyLen, secret.length);
  assert.equal(diag.keyHadWhitespace, true);
  assert.equal(JSON.stringify(diag).includes(secret), false);
});

test("keyKind is jwt and keySource falls through to SECRET", () => {
  process.env.VERCEL_ENV = "preview";
  process.env.T4T_ALLOW_NONPROD_SUPABASE = "1";
  process.env.SUPABASE_URL = "https://projref.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "neutralized";
  process.env.SUPABASE_SECRET_KEY = ` ${KEY} `;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(isSupabaseConfigured(), true);
  const diag = supabaseDiag();
  assert.equal(diag.keySource, "SECRET");
  assert.equal(diag.keyKind, "jwt");
  assert.equal(diag.keyHadWhitespace, true);
  assert.equal(diag.keyLen, KEY.length);
  assert.equal(JSON.stringify(diag).includes(KEY), false);
});

test("sb_secret_ REST calls send apikey and not Authorization Bearer", async () => {
  const secret = "sb_secret_header_check_value";
  process.env.VERCEL_ENV = "production";
  process.env.SUPABASE_URL = "https://headercheck.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = `${secret}\n`;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.T4T_ALLOW_NONPROD_SUPABASE;
  const seen: Headers[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    seen.push(new Headers(init?.headers));
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const client = getServiceSupabase();
    await client.from("boards").select("id").limit(1);
  } finally {
    globalThis.fetch = original;
  }
  assert.ok(seen.length > 0);
  for (const headers of seen) {
    assert.equal(headers.get("apikey"), secret);
    assert.equal(headers.get("Authorization"), null);
  }
});

test("production health body does not include supabaseDiag", () => {
  withKeys();
  process.env.VERCEL_ENV = "production";
  const body = withSupabaseHealthDiag({
    ok: true,
    service: "live-game",
    protocol_version: 1,
  });
  assert.deepEqual(body, { ok: true, service: "live-game", protocol_version: 1 });
  assert.equal("supabaseDiag" in body, false);
});

test("non-production health body includes supabaseDiag without key material", () => {
  const secret = "sb_secret_diag_hidden_value";
  process.env.VERCEL_ENV = "preview";
  process.env.SUPABASE_URL = "https://diaghost.supabase.co/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = secret;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  const body = withSupabaseHealthDiag({ ok: true, service: "live-game" });
  assert.equal(body.ok, true);
  assert.ok("supabaseDiag" in body);
  const diag = body.supabaseDiag;
  assert.equal(diag.urlHost, "diaghost.supabase.co");
  assert.equal(diag.keyKind, "sb_secret");
  assert.equal(diag.keySource, "SERVICE_ROLE");
  assert.equal(diag.keyLen, secret.length);
  assert.equal(diag.keyHadWhitespace, false);
  assert.equal(JSON.stringify(body).includes(secret), false);
});
