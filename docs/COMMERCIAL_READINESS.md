# CogniHood commercial-readiness decisions

This document records the current product policy and the parts of the prototype data model that must be treated cautiously. It is an engineering review, not medical, privacy, or legal advice.

## Decisions already made

- Authentication is confirmed email/password only. Anonymous, phone, and social providers remain disabled.
- Google Gemini is called only by the authenticated Supabase Edge Function. The browser never receives the Gemini credential.
- Local MediaPipe monitoring remains available without cloud processing.
- Cloud processing requires explicit consent for each trip and does not store raw camera frames in the application database.
- Cloud sampling is adaptive: every 15 seconds normally, every 6 seconds during a warning, and every 4 seconds during a critical or ineligible state.
- The server ceiling is 15 AI requests per minute and 2,500 requests per 24-hour quota window per user.

## Live Supabase review (12 October 2026)

The public project configuration was inspected without a service-role key or user session:

- Email is the only enabled authentication provider.
- New account registration is enabled and email confirmation is required.
- `profiles`, `trips`, and `cognitive_fingerprints` expose the columns expected by the repository.
- Anonymous reads returned no rows for all three tables.
- `ai_rate_limits` is not yet present in the deployed schema. Apply migration `002_security_hardening.sql` before deploying the Edge Function.

This check does not prove every authenticated RLS path. Before launch, test two separate user accounts and verify that neither account can select, insert, update, or delete the other's records.

## Existing table assessment

### `profiles` — keep

This is still the correct home for minimal account-facing metadata such as the generated CogniID and display name. Do not put consent history, entitlement state, or sensitive driving traits in this table.

### `trips` — keep the concept, revise several meanings

The trip record is useful, but some current values are prototype estimates:

- `distance_mi` is inferred from duration using a fixed assumed speed, not GPS or odometer data.
- `national_percentile` and `national_comparison` use hard-coded reference curves, not a validated national dataset.
- Harsh braking and acceleration are inferred from browser motion sensors without vehicle-specific calibration.
- `reckless_flag` is an unnecessarily strong claim; use a neutral term such as `driving_pattern_deviation`.
- Scores, events, and timelines are currently assembled by the client and therefore cannot be considered tamper-resistant.

For a commercial release, add a measurement source, algorithm version, confidence, and processing version. Compute authoritative summaries server-side. Do not market these values as validated national rankings until a documented representative dataset and methodology exist.

### `cognitive_fingerprints` — retain only as a versioned driver baseline

The historical baseline is useful for personalization, but its current name can imply biometric identity. Rename the product concept to **driver baseline**, calculate it server-side from trusted trip inputs, and store the algorithm version and minimum sample threshold. Do not use it for authentication or identity matching.

### `ai_rate_limits` — deploy

This table is intentionally inaccessible to browser roles. A security-definer function, callable only by the service role, atomically enforces the per-minute and daily ceilings.

## Tables needed before commercial launch

- `consent_records`: immutable privacy, terms, cloud-frame-processing, and policy versions with timestamps.
- `processing_runs`: model/provider, model version, algorithm version, input provenance, confidence, latency, and failure reason for each derived assessment.
- `devices`: revocable device registrations and app versions, without covert fingerprinting.
- `audit_events`: security-relevant account and administrative actions with a bounded retention policy.
- `data_subject_requests`: export/deletion workflow and completion evidence.
- `organizations` and memberships only when fleet or employer accounts are introduced; keep consumer accounts isolated until then.

## Legacy IndexedDB policy

Older builds stored trips and the baseline in browser IndexedDB. Automatically assigning that browser data to the next signed-in account could expose one person's history to another person on a shared device. The current importer therefore:

1. reports that legacy data exists;
2. requires the signed-in user to confirm ownership;
3. uploads only after confirmation; and
4. deletes the browser copy only after the upload succeeds.

If no real users ran the legacy build, remove the importer before launch. If legacy users exist, announce a 60–90 day migration window, measure completion without collecting trip content, and remove the importer at the end of that window.

## Launch gates still requiring owner input

- Production and staging domains for `ALLOWED_ORIGINS`.
- Google Cloud project, paid Gemini plan, replacement authorization key, billing alerts, and selected production model.
- Supabase project access to apply the migration, configure Auth/SMTP/CAPTCHA, set secrets, and deploy the function.
- Expected monthly active users, peak concurrent trips, typical trip duration, and monthly AI budget so the initial quotas can be cost-tested.
- Whether any real legacy IndexedDB users exist.
- Retention periods, supported countries/states, customer type (consumer or fleet), and the approved privacy/consent language.
