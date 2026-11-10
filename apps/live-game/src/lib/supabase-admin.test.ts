import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase-admin";

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
