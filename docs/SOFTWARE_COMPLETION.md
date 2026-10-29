# Software implementation and deployment status

This work excludes email/SMTP setup. Completed commits are pushed promptly; a source commit is not proof of backend deployment or real-world model accuracy.

## Camera performance

The camera now prefers a dedicated classic Web Worker for MediaPipe inference, with GPU-to-CPU initialization fallback inside the worker. Browsers without worker/bitmap support, or failed worker initialization, use the existing main-thread compatibility path. Only one transferred bitmap is in flight, preventing frame queues; bitmap, timer and worker resources are released on cancellation/unmount. A stalled worker times out rather than holding analysis busy indefinitely. Capture timestamps survive asynchronous processing.

WASM scripts/binaries are copied from the installed SDK into versioned same-origin paths before dev/build. This avoids an SDK/WASM version mismatch and external script execution. CSP permits WebAssembly compilation without allowing JavaScript eval. The model remains fetched from its existing pinned Google-hosted path.

A dashboard watchdog withdraws stale camera evidence when callbacks stop. Missing-camera assessments are not appended as valid local trip observations. Worker protocol/lifecycle behavior has unit tests; browser and target-device validation are separate checks. No measured Pi/mobile performance or population accuracy claim is made.

## Access limitations

The available Supabase CLI login lists projects in a different account/organization and does not include CogniHood. Those projects were not modified. Docker is not installed in the local environment. Do not use unrelated accounts/projects as staging, extract browser login tokens, or claim a live deployment on the basis of local SQL tests.

Further implementation and verification results are recorded below as completed.

## Storage/write safeguards (migration 007)

Migration 007 implements configurable, atomic write and storage budgets with private counters; it has not been deployed to production. Provisional defaults are 120 new sessions and 16 MiB of request accounting per rolling 24 hours, 1,000 stored sessions / 100 MiB estimated payload per account, a 1 MiB request bound and 400 MiB estimated global payload. They are engineering defaults for evaluation, not commercial plan entitlements. Owners can adjust `trip_limits_policy`; browser roles cannot edit or read private quota tables. Physical database, indexes, backups, profiles and consent storage require separate platform monitoring.

Idempotent retries do not spend another allowance. Failed inserts roll back budget reservations; deleting sessions releases stored capacity but does not refund daily ingestion allowance. No automatic retention deletion was introduced. Existing data is not deleted even if it already exceeds a new cap. The original record RPC becomes a private helper and cannot bypass budgets from a browser role. SQL tests cover repeatable migration application, idempotent accounting, daily rejection and storage release; real PostgreSQL concurrency tests are a separate integration check.

Session reports now provide individual export and user-confirmed deletion, giving users a way to free storage and to export a session when the bounded full-history export is too large. Full baseline recomputation remains bounded by the session count cap; this is not an incremental aggregation implementation.

## Browser regression checks

`Browser checks` runs pinned Playwright/Chromium in GitHub's isolated runner, using a synthetic test-only build. It checks responsive login overflow, keyboard focus, private-route redirection, production CSP and actual worker/WASM initialization on a non-face canvas stream. The harness is excluded from production builds/uploads. The test server reproduces the app security headers. Tracing/video recording is disabled; no production account or camera is used. Worker timing reported by this fixture is a CI observation, not a Pi/mobile performance benchmark. The workflow must pass before its behavior is treated as verified.

The first browser run caught a native `createImageBitmap` receiver error; the capture wrapper was corrected. All three Chromium checks passed on commit `563303e`, including actual worker/WASM processing. This does not validate facial accuracy or target-device speed.

## Disposable backend integration

`Backend integration` provisions a Docker Supabase stack inside an isolated GitHub runner, applies migrations and creates two disposable, already-confirmed fixture accounts. It checks cross-account access, anonymous reads, private RPC/table privileges, idempotent writes and twelve simultaneous writes competing for one remaining allowance. It also checks Edge Function authentication, consent revocation, origin/body guards and fresh-auth account deletion with cascading data removal. The runner does not send confirmation emails or call Gemini. CLI credentials are captured privately and never uploaded as artifacts. Only loopback API URLs are accepted. The suite is committed for execution; its passing workflow result is required before claiming verification. It does not deploy production migrations/functions or configure staging.

The complete disposable Supabase suite passed on commit `3d155c5` (GitHub run `40933517055`), including real PostgreSQL concurrency and both Edge Functions.

## Raspberry Pi integration

The collaborator's hardware branch is integrated with a loopback-only, same-origin, 1 KiB bounded GPIO alert endpoint. It plays a fixed three-pulse cue, enforces a five-second cooldown and returns output low on cleanup. Browser requests have a three-second timeout and are canceled when the component leaves; the build flag defaults off and requests require a loopback hostname. The bridge reproduces website security headers with appropriate HTTP-loopback adjustments and avoids logging request bodies.

The optional simulation classes have provider cleanup, callback removal, cleared telemetry and idempotent timer setup. Vehicle braking, speed-control and autonomous-stop commands were removed. Mock telemetry does not automatically run or enter real session scores. Hardware HTTP/GPIO behavior is tested with mock outputs; Pi dependencies are audited without compiling native bindings on Windows. Actual Pi electrical compatibility, native compilation, camera/display behavior and performance still require a device. The Pi package is excluded from Vercel uploads.
