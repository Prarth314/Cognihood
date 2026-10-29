// Disposable Docker stack only. No production project, SMTP or provider credentials.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

if (process.platform !== 'linux' || process.env.CI !== 'true') {
  throw new Error('Run this disposable-stack suite in the Backend integration Linux CI job.');
}
const cli = (...args) => execFileSync('npx', ['--yes', 'supabase@2.122.0', ...args], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600_000, maxBuffer: 8 * 1024 * 1024,
});
const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const temp = mkdtempSync(join(tmpdir(), 'cognihood-backend-'));
let server;
try {
  console.log('Starting disposable local Supabase stack.');
  cli('start', '--exclude', 'studio,realtime,storage-api,imgproxy,postgres-meta,logflare,vector,supavisor,mailpit');
  cli('db', 'reset', '--local');
  const settings = JSON.parse(cli('status', '--output', 'json'));
  const api = new URL(settings.API_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(api.hostname), 'Only loopback fixtures are permitted');
  assert(settings.ANON_KEY && settings.SERVICE_ROLE_KEY, 'Local credentials available');
  const admin = createClient(api.href, settings.SERVICE_ROLE_KEY, authOptions);
  const anonymous = createClient(api.href, settings.ANON_KEY, authOptions);
  const users = [];
  for (let index = 0; index < 2; index++) {
    const email = `fixture-${randomUUID()}@example.invalid`;
    const password = `Fixture-${randomUUID()}!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(created.error, null, 'Fixture account creation');
    const client = createClient(api.href, settings.ANON_KEY, authOptions);
    const session = await client.auth.signInWithPassword({ email, password });
    assert.equal(session.error, null, 'Fixture password login');
    users.push({ id: created.data.user.id, client, token: session.data.session.access_token });
  }
  const [a, b] = users;
  const trip = (user, id = randomUUID()) => ({
    id, user_id: user.id, start_time: 1000, end_time: 61000, duration_ms: 60000,
    avg_score: 80, min_score: 80, max_score: 80, state: 'SAFE', cog_load: 'LOW',
    incidents: 0, distance_mi: 0, events: [], coaching_tips: [], eligibility_flags: 0,
    hypnosis_events: 0, attention_failures: 0, harsh_brakes: 0, harsh_accels: 0,
    avg_perclos: 0, avg_hhi: 0, avg_distraction: 0, fingerprint_deviation: 0,
    reckless_flag: false, national_percentile: 0, national_comparison: {},
    score_timeline: [], algorithm_version: 'isolated-fixture', cloud_analysis_used: false,
  });
  const save = (user, payload) => user.client.rpc('record_trip', { p_trip: payload });
  const original = trip(a);
  assert.equal((await save(a, original)).error, null, 'Own trip saved');
  assert.equal((await save(a, original)).error, null, 'Idempotent retry saved');
  assert.equal((await save(b, trip(b))).error, null, 'Second account trip saved');
  assert((await save(b, trip(a))).error, 'Cross-account RPC rejected');
  assert.deepEqual((await b.client.from('trips').select('id').eq('user_id', a.id)).data, [], 'Cross-account read hidden');
  assert.deepEqual((await anonymous.from('trips').select('id')).data, [], 'Anonymous read hidden');
  await b.client.from('trips').delete().eq('id', original.id);
  assert.equal((await admin.from('trips').select('id').eq('id', original.id)).data.length, 1, 'Cross-account delete has no effect');
  assert((await a.client.rpc('record_trip_without_budget', { p_trip: trip(a) })).error, 'Private write helper inaccessible');
  assert((await a.client.from('trip_write_budgets').select('*')).error, 'Private accounting inaccessible');
  console.log('PASS: account isolation, anonymous access, helper grants and idempotent saves.');

  assert.equal((await admin.from('trip_limits_policy').update({ max_trips_per_day: 2 }).eq('singleton', true)).error, null);
  const attempts = await Promise.all(Array.from({ length: 12 }, () => save(a, trip(a))));
  assert.equal(attempts.filter(result => !result.error).length, 1, 'Only one concurrent write fits the remaining budget');
  assert.equal((await admin.from('trip_write_budgets').select('trip_count').eq('user_id', a.id).single()).data.trip_count, 2);
  assert.equal((await admin.from('trips').select('id').eq('user_id', a.id)).data.length, 2);
  assert.equal((await admin.from('trip_limits_policy').update({ max_trips_per_day: 120 }).eq('singleton', true)).error, null);
  console.log('PASS: real PostgreSQL concurrent quota reservations do not overspend.');

  const receipt = await a.client.rpc('record_cloud_consent', { p_policy_version: '2026-10-28.2' });
  assert.equal(receipt.error, null, 'Consent recorded');
  assert.equal((await b.client.rpc('revoke_cloud_consent', { p_receipt: receipt.data })).error, null);
  assert.equal((await admin.from('consent_records').select('revoked_at').eq('id', receipt.data).single()).data.revoked_at, null);
  assert.equal((await a.client.rpc('revoke_cloud_consent', { p_receipt: receipt.data })).error, null);

  const envFile = join(temp, 'functions.env');
  writeFileSync(envFile, 'GEMINI_API_KEY=fixture-never-call-provider\nALLOWED_ORIGINS=http://127.0.0.1:3000\n', { mode: 0o600 });
  server = spawn('npx', ['--yes', 'supabase@2.122.0', 'functions', 'serve', '--env-file', envFile], { stdio: 'ignore' });
  const invoke = (name, token, body, origin = 'http://127.0.0.1:3000') => fetch(new URL(`functions/v1/${name}`, api), {
    method: 'POST', headers: { apikey: settings.ANON_KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', origin }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  let ready = false;
  for (let index = 0; index < 60; index++) {
    try { const response = await invoke('gemini-assist', a.token, { action: 'analyze' }); ready = response.status === 403; await response.text(); } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert(ready, 'Functions become ready and enforce consent');
  assert.equal((await invoke('gemini-assist', a.token, { action: 'analyze', consentReceipt: receipt.data })).status, 403, 'Revoked consent rejected');
  assert.equal((await invoke('gemini-assist', a.token, {}, 'https://untrusted.invalid')).status, 403, 'Untrusted origin rejected');
  assert.equal((await invoke('gemini-assist', null, {})).status, 401, 'Missing bearer token rejected');
  assert.equal((await invoke('gemini-assist', a.token, { padding: 'x'.repeat(2_000_001) })).status, 413, 'Oversized request rejected');
  assert.equal((await invoke('delete-account', a.token, {})).status, 400, 'Explicit deletion confirmation required');
  assert.equal((await invoke('delete-account', a.token, { confirmation: 'DELETE' })).status, 200, 'Fresh authenticated deletion succeeds');
  for (const table of ['trips', 'consent_records', 'trip_write_budgets', 'trip_storage_usage', 'cognitive_fingerprints']) {
    const result = await admin.from(table).select('user_id').eq('user_id', a.id);
    assert.equal(result.error, null, `${table} query succeeds`);
    assert.deepEqual(result.data, [], `${table} cascades on account deletion`);
  }
  assert.deepEqual((await admin.from('profiles').select('id').eq('id', a.id)).data, [], 'Profile removed');
  assert.equal((await admin.from('trips').select('id').eq('user_id', b.id)).data.length, 1, 'Other account preserved');
  assert.equal((await admin.auth.admin.deleteUser(b.id)).error, null);
  console.log('PASS: Edge authentication, consent, origin/body guards and account deletion cascades. No provider or email calls made.');
} catch (error) {
  // Never print arbitrary CLI/API error objects: they may include local tokens.
  console.error('Backend integration failed:', error instanceof assert.AssertionError ? error.message : 'stack or request failure; no credentials logged');
  process.exitCode = 1;
} finally {
  server?.kill('SIGTERM');
  rmSync(temp, { recursive: true, force: true });
}
