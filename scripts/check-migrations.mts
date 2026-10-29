// Isolated in-memory PostgreSQL. No connection string or real account data is used.
// Run: npm exec --yes --package=deno@2.5.6 -- deno run --node-modules-dir=none --allow-read --allow-env scripts/check-migrations.mts
import { PGlite } from 'npm:@electric-sql/pglite@0.5.13';

const db = new PGlite();
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  for (const name of [
    '001_initial_schema',
    '002_security_hardening',
    '003_commercial_integrity',
    '004_rpc_privileges',
    '005_rls_initplans',
    '006_cloud_consent_receipts',
  ]) {
    await db.exec(await Deno.readTextFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url)));
  }
  // The additive repair migrations must also tolerate a repeated application.
  for (const name of ['004_rpc_privileges', '005_rls_initplans', '006_cloud_consent_receipts']) {
    await db.exec(await Deno.readTextFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url)));
  }
  await db.exec(`insert into auth.users (id) values ('${userA}'), ('${userB}');`);
  const privileges = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('authenticated', 'public.recompute_cognitive_fingerprint(uuid)', 'execute') as allowed`,
  );
  assert(privileges.rows[0].allowed === false, 'Authenticated role must not directly recompute arbitrary baselines.');
  const triggerPrivileges = await db.query<{ allowed: boolean }>(
    `select has_function_privilege('anon', 'public.handle_new_user()', 'execute') as allowed`,
  );
  assert(triggerPrivileges.rows[0].allowed === false, 'Anonymous trigger execution grant must be revoked.');
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userA}', false);`);
  const consent = await db.query<{ receipt: string }>(`select public.record_cloud_consent('2026-10-28.2') as receipt`);
  const receipt = consent.rows[0].receipt;
  const retry = await db.query<{ receipt: string }>(`select public.record_cloud_consent('2026-10-28.2') as receipt`);
  assert(retry.rows[0].receipt === receipt, 'Consent retry must reuse a recent receipt.');
  await db.exec(`select set_config('request.jwt.claim.sub', '${userB}', false);`);
  assert(
    (await db.query('select * from public.consent_records')).rows.length === 0,
    'Consent receipts must not cross accounts.',
  );
  await db.query('select public.revoke_cloud_consent($1::uuid)', [receipt]);
  await db.exec(`reset role;`);
  const intact = await db.query<{ revoked_at: unknown }>('select revoked_at from public.consent_records where id=$1', [
    receipt,
  ]);
  assert(intact.rows[0].revoked_at === null, 'Another user must not revoke this receipt.');
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userA}', false);`);
  await db.query('select public.revoke_cloud_consent($1::uuid)', [receipt]);
  const revoked = await db.query<{ revoked_at: unknown }>('select revoked_at from public.consent_records where id=$1', [
    receipt,
  ]);
  assert(revoked.rows[0].revoked_at !== null, 'Owner must be able to revoke consent.');
  await db.exec('reset role;');
  for (const uid of [userA, userB]) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
    const trip = {
      id: `fixture-trip-${uid}`,
      user_id: uid,
      start_time: 1000,
      end_time: 31000,
      duration_ms: 30000,
      avg_score: 80,
      min_score: 80,
      max_score: 80,
      state: 'SAFE',
      cog_load: 'LOW',
      incidents: 0,
      distance_mi: 0,
      events: [],
      coaching_tips: [],
      eligibility_flags: 0,
      hypnosis_events: 0,
      attention_failures: 0,
      harsh_brakes: 0,
      harsh_accels: 0,
      avg_perclos: 0,
      avg_hhi: 0,
      avg_distraction: 0,
      fingerprint_deviation: 0,
      reckless_flag: false,
      national_percentile: 0,
      national_comparison: {},
      score_timeline: [],
      algorithm_version: 'fixture',
      cloud_analysis_used: false,
    };
    await db.query('select public.record_trip($1::jsonb)', [JSON.stringify(trip)]);
    const rows = await db.query<{ user_id: string }>('select user_id from public.trips');
    assert(rows.rows.length === 1 && rows.rows[0].user_id === uid, 'RLS must expose only the caller’s trips.');
    await db.exec('reset role;');
  }
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${userA}', false); delete from public.trips;`,
  );
  const baseline = await db.query('select * from public.cognitive_fingerprints');
  assert(baseline.rows.length === 0, 'Delete trigger must still recompute the caller baseline after privilege repair.');
  await db.exec('reset role;');
  const remaining = await db.query<{ user_id: string }>('select user_id from public.trips');
  assert(
    remaining.rows.length === 1 && remaining.rows[0].user_id === userB,
    'Deleting one user’s trips must preserve the other account.',
  );
  await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  const anonymous = await db.query('select * from public.trips');
  assert(anonymous.rows.length === 0, 'Anonymous reads must reveal no trips.');
  await db.exec('reset role;');
  const policies = await db.query<{ qual: string | null; with_check: string | null }>(
    `select qual, with_check from pg_policies where schemaname='public'`,
  );
  assert(
    policies.rows.every((p) =>
      [p.qual, p.with_check].every((value) => !value || !value.includes('auth.uid()') || /select/i.test(value)),
    ),
    'Policy repair must cache auth.uid().',
  );
  console.log(
    'PASS: 001–006 apply; repairs repeat; two synthetic users remain isolated; RPC grants, consent issuance/revocation and deletion trigger verified.',
  );
} finally {
  await db.close();
}
