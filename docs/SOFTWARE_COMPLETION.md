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
