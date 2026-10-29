# Product experience redesign

The subsequent [October 28 security review](SECURITY_AUDIT_2026-10-28.md) adds code repairs and three prepared SQL migrations to this branch. Its deployment requirements supersede the original redesign-only rollout notes below; no production SQL, functions or Auth settings were changed by that review.

## Review environment

- Branch: `codex/product-experience-redesign`
- Preview: https://cognihood-git-codex-product-experience-redesign-cognihood.vercel.app/
- Production and `main` have not been changed by this redesign.
- No database migrations, production Auth changes, secret changes, new analytics, or package dependencies were introduced.

## Design and content

Warm neutral surfaces, forest-green accents, editorial typography, numbered sections, and clearly labeled conceptual diagrams give the website a distinct identity. The application shares semantic color, spacing, surface, type, and control styles, including a redesigned session overview, sidebar, authentication layout, and legal-page presentation. Existing camera, monitoring, archives, export, consent, account deletion, and recovery implementations remain in place.

Public copy is based on the repository's implemented features and commercial-readiness documentation. The hardware page describes Raspberry Pi integration as development work with no specification, shipping, certification, or manufacturing promise. No invented customers, testimonials, medical evidence, or company credentials appear. The existing legal documents retain their substantive wording.

## Routes

| URL | Behavior |
| --- | --- |
| `/` | Public homepage, including for signed-in users; an Open app action is available |
| `/mission` | Mission, motivation, audience, and principles |
| `/how-it-works` | Experience, implementation, available vs configuration-dependent features |
| `/hardware` | Hardware purpose, relationship to software, and development limitations |
| `/login` | Email sign-in, signup, callback notices, and password recovery |
| `/app` | Protected workspace overview |
| `/app/records` | Protected trip archives; login preserves the intended destination |
| `/app/predrive` | Protected consent and camera check |
| `/app/dashboard` | Direct entry passes through pre-drive consent; live monitoring starts only after that workflow |
| Existing `/*.html` legal URLs | Preserved; every policy appears in the public footer |

Only exact allowlisted app paths are accepted as post-login destinations. External, encoded, protocol-relative, backslash, traversal, and nested-query destinations fall back to `/app`. Existing root email callbacks are still recognized before analytics/client initialization and displayed on the login experience. Existing Supabase redirect settings need no change for this compatibility behavior.

## Engineering

- `components/website/MarketingPage.tsx`: shared public header/footer and four public pages; renders without authentication.
- `components/website/Website.tsx`: public/auth/protected entry points and route metadata; lazy-loads the monitoring app.
- `services/siteRoutes.ts`: route metadata, legal inventory, and safe destination helpers.
- `product.css`: semantic product tokens, public/auth layouts, shared workspace refinements, responsive rules, reduced motion.
- `components/layout/AppShell.tsx`: mobile navigation focus containment, Escape handling, inert off-screen navigation, website link, sign-out pending/error states.
- `components/ModuleSelector.tsx`: session overview and existing monitoring/archive/account actions.
- `scripts/prerender.mjs`: build-time HTML for public pages using their real React components; separate empty/private app and login entry points. No backend data is read while rendering.
- `scripts/verify-build.mjs`: verifies crawlable public HTML, internal destinations, social artwork, and noindex/private app entry points after each build.
- `vercel.json`: public/app route rewrites and private-route noindex headers. Existing CSP and other security headers are retained.
- `public/`: original SVG concept artwork, raster social image, favicon, sitemap, robots rules, and visual legal stylesheet updates.

There is no new runtime dependency. Prettier was used as an ephemeral source formatter, not added to the dependency graph.

## Verification performed

- Baseline: TypeScript, 22 tests, and Vite production build passed before changes.
- Redesign: TypeScript, 29 tests, production build, and build-time prerendering passed.
- Production dependency audit: zero known vulnerabilities at review time.
- Staged secret scan passed without exposing any values.
- Public homepage renders without authentication; all twelve policy destinations remain linked from every public page.
- Tests cover return-URL rejection, public/private route separation, direct dashboard gating, workspace entry actions, and inert mobile navigation.
- Browser checks at desktop, 820px tablet, and 390px mobile: public pages and login had no measured horizontal overflow. Mobile menu opened and exposed its links. Protected archives redirected to login with the intended destination.
- Vercel preview verified: homepage, mission, how-it-works, hardware, login, legal page, and completed protected-route redirect. No error logs were observed during these checks.

## Limits and owner review

The Vercel **Preview** environment is missing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or its supported publishable-key alias). It therefore displays the existing configuration warning and disables sign-in. No values were copied into it and no production environment was altered. Configure an appropriate non-production Supabase project in Preview, redeploy, and verify real sign-in, signup, recovery, expiration, two-account authorization, archives, and camera/device workflows before approval. Production credentials or user records must not be used to manufacture test results.

The local configured app verified sign-in presentation and callback behavior, but there was no authorized signed-in test account or physical hardware session for an end-to-end authenticated usability test. Existing core unit tests remain green; that is not a substitute for live account and device testing. No claim of a complete accessibility or production RLS audit is made.

SMTP delivery and branded hosted email setup remain deferred at the owner's request. The repository includes their instructions and template. Hardware specifications, verified availability, business/private support contacts, and independent performance evidence remain owner decisions; the website does not invent them. GitHub is the current public project/contact route; sensitive reports should use the repository's private vulnerability reporting channel.

## Production rollout and rollback

1. Review the preview on mobile and desktop. Configure the non-production auth environment and complete the live checks listed above.
2. Obtain explicit owner approval to release. Review and merge this branch to `main` only after approval; the existing Git integration will deploy it automatically.
3. Verify public routes, static legal pages, production email callbacks at `/`, sign-in return destinations, consent, live monitoring, and archives. Review Vercel logs and check the generated social image.
4. If a regression occurs, use Vercel's previous production deployment to roll back after authorization, then revert the redesign commits on `main`. No database rollback is needed because there are no schema changes. Do not rewrite unrelated commit history.
