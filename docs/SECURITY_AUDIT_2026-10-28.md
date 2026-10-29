# Security, privacy, reliability and performance review

Reviewed October 28, 2026 (America/Chicago; checks continued into October 29 UTC).

This is a bounded source and configuration audit, not proof that every possible exploit has been found. Scope: application code, SQL migrations, Edge Functions, build/CI, GitHub repository history, publicly reachable Vercel deployment and accessible Supabase settings. No production records were edited, test accounts created, emails sent, attack load generated, or production migrations/functions deployed.

Repairs are on `codex/product-experience-redesign`, in PR #21. **A branch repair does not mean production is repaired.** The existing requirement for approval before production deployments, Auth/secret changes and database changes remains in effect.

## Evidence

| Check | Observed result | Limit |
| --- | --- | --- |
| Fresh GitHub mirror, advertised branches/tags/PR references | Gitleaks 8.30.1: 28 commits, approximately 1.12 MB scanned, zero findings before this audit commit | Excludes inaccessible/deleted objects, forks, screenshots and unknown secret formats |
| Known private credential comparison | One private local value checked against 302 mirrored Git blobs and 36 generated build files; no matches | Public Supabase publishable/anon keys are intentionally not classified as private credentials |
| GitHub secret-scanning alerts | Empty | Empty alerts cannot prove absence of sensitive information |
| Full npm audit, including dev dependencies | Zero reported vulnerabilities; 186 dependencies | Does not detect application logic or every supply-chain risk |
| Supabase Security Advisor | Zero errors; three warnings: two trigger-function execute grants and leaked-password protection disabled | Trigger grants alone do not demonstrate privilege escalation |
| Supabase Performance Advisor | Ten RLS initialization warnings; two unused-index informational notices | Indexes were not dropped; production workloads were not benchmarked |
| Bounded anonymous REST reads | No rows returned from profiles, trips or cognitive_fingerprints; anonymous OpenAPI exposed no RPC paths | Does not replace authenticated two-account testing |
| Anonymous quota/consent REST requests | 404 | Could reflect permissions/exposure/schema cache; not proof that tables are absent |
| Edge Functions dashboard and routes | “Deploy your first edge function”; both application function routes return 404 | No deployed non-production function integration was available |
| Auth settings | Email and confirmation enabled; anonymous and other providers disabled; secure email change enabled | Delivery/signup/recovery not exercised with real users |
| Production headers | CSP, HSTS, frame denial, MIME protection and referrer policy present | Not an XSS or compatibility guarantee |
| Protected Vercel Preview | Unauthenticated HTTP requests redirect to Vercel login | Headers on that login page do not describe the app's CSP |
| Vercel project protection | Standard Vercel Authentication enabled; protected source maps enabled; no active shareable links or automation bypass secrets listed | Team/account MFA, historical access logs and every integration grant were not exhaustively reviewed |

No leaked private key or published customer record was found in inspected material. Ignored local credentials are not evidence of publication. Commit-author names/emails are expected public collaboration metadata; contributor history was not rewritten. Provider logs, all historical deployments, screenshots and unadvertised/deleted history were not exhaustively inspected.

## Repairs and findings

“Fixed in branch” means implemented and locally checked; production is unchanged. Priorities reflect likely impact, not CVSS scores.

| ID | Priority | Finding and consequence | Repair and status |
| --- | --- | --- | --- |
| F01 | High reliability | Camera snapshots used a performance clock while temporal windows/pre-drive used epoch time; valid samples could be immediately pruned. | Keep MediaPipe's monotonic input; store epoch timestamps. Regression test covers both clocks. **Fixed in branch.** |
| F02 | Medium correctness | Closure and reopening both counted as blinks, inflating rates. | Count only reopening; reset transition after detection loss. Full-blink test. **Fixed in branch.** |
| F03 | Medium availability | GPU failure had no CPU fallback; failed initialization stayed cached and prevented retry. | CPU fallback and retryable initialization; tests cover both. **Fixed in branch.** |
| F04 | Medium performance | Changing cloud callbacks repeatedly restarted the frame interval; UI/temporal state work ran at full sample frequency. | Stable callback ref; retain 10 Hz samples, run UI/temporal updates at 2 Hz; skip hidden-tab inference. **Fixed in branch.** |
| F05 | Low reliability | Released wake locks remained cached, blocking visibility-driven reacquisition. | Clear cached sentinel on release. Device verification remains required. **Fixed in branch.** |
| F06 | High correctness | Insufficient camera coverage could eventually yield an eligible indicator or leave a previous indicator active. | Immediately return monitoring, zero confidence and canDrive=false for inadequate samples/coverage. Two regression tests. These are experimental indicators, not driving clearance. **Fixed in branch.** |
| F07 | High data integrity | Finalization could clear a trip before saving succeeded; retries/concurrent ending actions could lose or race the record. | Retain the finalized pending trip until success and share concurrent save attempts. Type-checked/code-reviewed; simulated UI save-failure test still required before release. **Fixed in branch.** |
| F08 | Medium privacy/correctness | Late cloud results could update another session or arrive after disabling cloud processing. | Abort on disable/exit/unmount; reject aborted/stale results using session generations. Cannot retract an image already received by a provider. **Fixed in branch.** |
| F09 | Medium availability | Client function calls lacked a complete request timeout. | 18-second browser timeout plus existing server model timeout. Verify target-browser AbortSignal support. **Fixed in branch.** |
| F10 | Medium abuse resistance | AI requests were fully read before size checking, allowing oversized chunked bodies to allocate memory first. | Stream at most 2 MB; require JSON objects/content type; validate base64 characters/length. Tests cover stream overflow and invalid types. JPEG signature checking is not a complete image decoder. **Fixed in branch.** |
| F11 | Medium service availability | Per-user rejected requests could consume global quota first; blank numeric settings could collapse limits. | Check user quota first; bound numeric settings and treat blanks as defaults. User quota may still be spent when the global budget is full. **Fixed in branch.** |
| F12 | Medium privacy | Raw model/parser error messages could contain image-derived content in server logs. | Log request IDs/status/error category instead of arbitrary response/parser text; deletion logs use error names. **Fixed in branch.** |
| F13 | Medium performance | Metric arrays grew indefinitely; long sessions could exceed stored chart/event limits. | Streaming aggregate statistics, maximum 500 events and 5,000 decimated chart points. 6,000-sample test checks bounds and full-session score statistics. Charts lose resolution; lifetime counters remain. **Fixed in branch.** |
| F14 | Medium reliability/performance | Archives requested everything without pagination; exports relied on the API's default row limit and could silently truncate. Export failures were not handled by the button. | Initial page of 50, explicit Load more, versioned stale-response handling; paginated exports fail above 10,000 trips or 20 MB serialized trip data. Page/oversize tests. Exports are not transactional snapshots. **Fixed in branch.** |
| F15 | Medium privacy | Legacy import could relabel an explicitly different account owner as the current user. | Reject owner mismatches; test uses an otherwise valid fixture. Ownerless legacy data still requires explicit user confirmation. **Fixed in branch.** |
| F16 | High data integrity | Legacy cleanup cleared entire stores, including skipped trips and a baseline that was never imported. | Delete only imported IDs; retain baselines/skipped records; reject unexpected key formats; close cleanup DB in finally; remove import marker that suppressed later imports. **Fixed in branch.** |
| F17 | Medium availability | Denied browser storage could throw during theme/onboarding setup and prevent rendering. | Safe preference storage with fallbacks and a denied-storage test. Supabase session persistence still depends on browser capabilities. **Fixed in branch.** |
| F18 | Low configuration | Empty anon-key configuration masked a valid publishable-key alias. | Trim and select the nonempty fallback. **Fixed in branch.** |
| F19 | High preventive control | A private credential mistakenly named VITE_* could enter downloadable assets. | Build-time rejection of recognized private credential names/formats and service-role JWTs; tests do not echo values. Heuristic, not a universal detector. **Fixed in branch.** |
| F20 | Medium privacy | Analytics had no app-level filter excluding authenticated routes or sensitive URL parameters. Actual disclosure was not demonstrated. | Public pageviews only; strip query strings; reject fragments/auth callbacks/login/app routes and custom payloads. Regression tests. **Fixed in branch.** |
| F21 | Medium account protection | A long-lived session alone was sufficient for irreversible account deletion; browser confirmation was not server-enforced. | After Auth verifies the bearer token, require its password AMR timestamp within five minutes, matched subject and bounded explicit confirmation body. Token refresh alone does not satisfy this. Tests cover old/recovery/mismatched/future claims. Client explains re-sign-in. Theft of an already fresh token remains a risk. **Fixed in branch; function not deployed.** |
| F22 | Medium supply chain | Actions used mutable tags; audits excluded dev tooling; no scheduled dependency update config. | Verified full-SHA action pins, no persisted checkout credentials, full npm audit, weekly Dependabot config. **Fixed in branch.** |
| F23 | Low preventive control | Sensitive exports/HAR captures could be staged accidentally. | Ignore common session-export names and HAR files. Does not remove already tracked files/history. **Fixed in branch.** |
| F24 | Medium authorization | Migration 003 leaves default PUBLIC execute on a privileged baseline helper. If deployed as written, direct arbitrary-user recomputation could waste resources. | Migration 004 revokes browser-role helper execution and trigger warning grants; keeps required service access. **SQL prepared and locally validated, not applied; live exploitability unconfirmed.** |
| F25 | Medium performance | Live policies repeatedly evaluate auth.uid() per row (ten warnings). | Migration 005 preserves predicates while wrapping uncached calls in statement-level subqueries. **SQL prepared and locally validated, not applied.** |
| F26 | Medium maintenance | GitHub vulnerability alerts and automated security fixes were disabled. | Enabled both; API reports automated fixes enabled/not paused. Secret scanning/push protection were already enabled. **Applied to GitHub.** |
| F27 | Medium privacy evidence | Consent was saved only with a completed trip; abandoned sessions could upload frames without a durable receipt. | Migration 006 issues scoped, versioned, expiring receipts before cloud starts; endpoint verifies ownership/version/expiry/revocation before quota or model calls; opt-out/exit stop uploads and request revocation. Staging must verify the full chain. **Code and SQL prepared; not deployed.** |
| F28 | High data integrity | Active trip initialization depended on the whole Auth user object; a token refresh producing a new object could reset the session. | Depend on stable account ID and view instead. **Fixed in branch; long-session authenticated refresh testing remains a release check.** |
| F29 | High data integrity | Rounding a fractional mean to an integer could put it outside the recorded min/max, violating the database score constraint and preventing saves. | Preserve the bounded fractional mean, format displays separately and add a regression test. **Fixed in branch.** |

## Outstanding production/configuration work

These tasks are not silently treated as completed. Follow the existing production approval requirement.

| ID | Priority | Evidence / impact | Next action |
| --- | --- | --- | --- |
| P01 | High availability | Neither Edge Function is deployed; optional AI and self-service account deletion cannot work. | Validate in a separate project; deploy functions with JWT checks, server-only secrets, exact origins and quota RPCs; test invalid auth, size/rate bounds, deletion cascade and local fallback. Then approve production deployment. |
| P02 | High release validation | Preview lacks public Supabase configuration; real auth flows cannot be tested there. | Configure an appropriate non-production project's URL and publishable/anon key in Preview only; rebuild; test signup/recovery/expiry and two-account isolation. Never use service-role/Gemini keys in browser variables. |
| P03 | High email usability | Site URL is https://cognihood-cognihood.vercel.app/; unauthenticated requests reach Vercel login. Public app is https://cognihood.vercel.app/. | Approve correcting Site URL to the public domain. Explicit production confirmation/recovery URLs are already allowlisted; fallback emails can still hit the protected alias. Verify fallback/template behavior in staging. |
| P04 | High product availability | Dashboard reports default templates and custom SMTP not configured; SMTP work was explicitly deferred. | Configure a verified sender/provider privately and test confirmations, recovery, bounces and delivery. No audit emails were sent. |
| P05 | Medium account protection | Secure password change/current-password checks disabled; password/email change notifications off; CAPTCHA off. Leaked-password protection disabled and requires Pro+. | Review reauthentication/password-reset compatibility before changing settings. Decide on CAPTCHA (requires client/provider setup), security notifications and any paid plan. Do not enable protections that the client cannot satisfy. |
| P06 | Medium repository protection | GitHub reports main has no branch protection. | Approve required PR review, verify/gitleaks checks, force-push/deletion restrictions and administrator bypass policy with collaborators. |
| P07 | Medium abuse/cost | Individual trip payloads are bounded, but no durable per-user ingestion frequency/storage budget exists. Baseline recomputation scans user history after insert/delete. | Define storage/write budgets and import allowances; add atomic server limits and concurrency tests. Benchmark before incremental/queued aggregation. This needs a product/retention policy, not an arbitrary silent cap. |
| P08 | Medium release coordination | F27 requires migration 006, frontend and endpoint to agree on the receipt contract. No production function is currently deployed. | Deploy the complete consent chain to staging first; test failure/expiry/revocation and local-only startup without the RPC. Abrupt tab closure/offline opt-out may leave a receipt active until expiry; cancellation cannot retract prior uploads. |
| P09 | Medium deployment integrity | Live anonymous quota/consent resources return 404; source and deployed function expectations differ; migration ledger not verified. | Compare actual schema/ledger to 001–006 in a non-production clone; apply only missing changes in order after backup and validation. Do not blindly rerun original migrations. |
| P10 | Low redirect scope | Production Auth allowlist includes team-scoped Vercel preview wildcards. | Prefer exact reviewed redirects and a separate preview backend; review trust scope before untrusted branch previews share production Auth. No arbitrary third-party redirect exploit was demonstrated. |
| P11 | Commercial release requirement | Vercel team is on Hobby. Vercel's published Hobby/fair-use terms restrict it to personal non-commercial use. | Review the intended usage with Vercel and choose an eligible plan before commercial operation. No subscription or purchase was made. [Provider guidance](https://vercel.com/docs/plans/hobby). |

## Performance and compatibility limits

- MediaPipe inference remains synchronous on the main thread. Sampling/UI bounds reduce unnecessary work but do not establish smooth Pi/mobile performance. Measure frame time, input latency, memory, thermal throttling and CPU fallback on target devices; a worker/offscreen implementation needs separate validation.
- Model/WASM resources are external at pinned paths. CDN/browser availability and CSP compatibility require real-device checks. CPU fallback can be slower than GPU inference.
- Initial archive rendering is bounded; manually loading many pages still grows the DOM. Exports fail explicitly at their stated limit and are not transactionally consistent snapshots. Stop session writes during export.
- AbortSignal.timeout/any support needs target-browser verification. There is no legacy-browser compatibility claim.
- No billing/load stress test, physical camera session or long-running production profiling was performed.

## Verification

TypeScript, **50 tests across 17 files**, production build/prerender/internal-link verification, full npm audit and known-private-value comparison pass. Both Edge Functions pass Deno type-checking. CI now runs Edge Function and isolated SQL checks as well as app checks.

An isolated in-memory PostgreSQL/PGlite check applies 001–006 with synthetic Auth roles/users, repeats 004–006, checks two-user row isolation and revoked RPC privileges, checks receipt issuance/retry/ownership/revocation, and confirms deletion triggers still recompute the correct baseline. This validates SQL with mocked Auth, not a real Supabase staging deployment.

```sh
npm run check
npm exec --yes --package=deno@2.5.6 -- deno check supabase/functions/gemini-assist/index.ts supabase/functions/delete-account/index.ts
npm exec --yes --package=deno@2.5.6 -- deno run --node-modules-dir=none --allow-read --allow-env scripts/check-migrations.mts
gitleaks git . --log-opts="--all --full-history" --redact=100 --no-banner --ignore-gitleaks-allow
```

Before release, use a separate backend with two synthetic accounts to test cross-account select/update/delete denial, RPC authorization, invalid recovery tokens, save-failure retries, legacy partial import, consent cancellation, real cameras, expired sessions and account deletion. No production user credentials are needed.

## Rollout and rollback

1. Review PR #21 and configure Preview with a non-production backend.
2. Verify the migration ledger, apply repairs in staging and test grants, policies, quotas, consent and deletion cascades.
3. Obtain explicit approval for production Auth, migrations/functions and merging main (which auto-deploys Vercel).
4. Check callbacks, headers, row isolation, function status, errors and local monitoring; keep frames/tokens/private identifiers out of logs.
5. Roll back frontend via Vercel after authorization if needed. Reverting frontend does not revert SQL; use a reviewed compensating migration. Do not restore broad PUBLIC privileges to hide an integration failure.

Provider references: [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase JWT claims and AMR](https://supabase.com/docs/guides/auth/jwt-fields).
