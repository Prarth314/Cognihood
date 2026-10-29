# Working together

Keep GitHub current so collaborators can see and build on completed work.

## Commit identity

At the repository owner's request, AI-assisted and automation-generated changes integrated by the owner use `Prarth Gupta <138802423+Prarth314@users.noreply.github.com>` as their Git author identity. Human collaborators retain their own authorship. Do not add AI co-author trailers to owner-authored commits. Review bot changes before integrating them under this identity; GitHub bot accounts and PR authors are separate from Git commit metadata and cannot be renamed through Git configuration.

Existing bot authors and AI co-author trailers were canonicalized in a coordinated history update. Collaborators with an older checkout must fetch and rebase preserved local work onto the new history, or clone afresh. Avoid merging the old history back into rewritten branches. Rewriting invalidates old commit signatures and changes descendant commit IDs; a private recoverable bundle was created before the update.

- Fetch the latest remote changes before starting and before merging. Preserve other contributors' work.
- Make small, focused commits and push each completed commit promptly to its remote branch. Do not accumulate unpublished commits across tasks.
- Push work in progress to a clearly identified branch when appropriate; do not describe it as validated or merge it merely to publish progress.
- Run the relevant checks before merging code into `main`. Review all changes in a PR, including dependencies, configuration and documentation.
- Merge ready work promptly when authorized. Prefer a merge commit when individual commits should remain visible in history.
- Do not force-push shared branches, rewrite contributor identities, publish secrets, or merge failing/unreviewed work to keep branches synchronized.
- A push to `main` triggers the configured Vercel production deployment. Supabase migrations, Edge Functions, Auth settings and secrets have separate rollout requirements; merging SQL files does not apply them.

Run `npm run check` for application changes. CI additionally checks Edge Functions and isolated SQL authorization behavior. See [the security audit](docs/SECURITY_AUDIT_2026-10-28.md) for remaining backend release requirements.
