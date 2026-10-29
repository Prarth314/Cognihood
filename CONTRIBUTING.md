# Working together

Keep GitHub current so collaborators can see and build on completed work.

- Fetch the latest remote changes before starting and before merging. Preserve other contributors' work.
- Make small, focused commits and push each completed commit promptly to its remote branch. Do not accumulate unpublished commits across tasks.
- Push work in progress to a clearly identified branch when appropriate; do not describe it as validated or merge it merely to publish progress.
- Run the relevant checks before merging code into `main`. Review all changes in a PR, including dependencies, configuration and documentation.
- Merge ready work promptly when authorized. Prefer a merge commit when individual commits should remain visible in history.
- Do not force-push shared branches, rewrite contributor identities, publish secrets, or merge failing/unreviewed work to keep branches synchronized.
- A push to `main` triggers the configured Vercel production deployment. Supabase migrations, Edge Functions, Auth settings and secrets have separate rollout requirements; merging SQL files does not apply them.

Run `npm run check` for application changes. CI additionally checks Edge Functions and isolated SQL authorization behavior. See [the security audit](docs/SECURITY_AUDIT_2026-10-28.md) for remaining backend release requirements.
