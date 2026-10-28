# Security policy

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/Prarth314/Cognihood/security/advisories/new). Include the affected component, safe reproduction steps, likely impact, and any relevant commit or deployment version. Private reporting is enabled for this repository.

Do not put credentials, face images, account details, trip history, or an exploitable vulnerability in a public issue. If you accidentally publish a credential, revoke or rotate it immediately. Removing a file or commit does not invalidate credentials or erase copies, forks, cached views, or old pull-request references.

Security reports are reviewed by the project maintainer. There is no guaranteed response time, paid bounty, or authorization to test other users' accounts or disrupt the hosted service.

## Keep credentials out of Git

- Store local credentials in ignored `.env.local` files and production credentials in the relevant platform's environment-variable or secret store.
- Commit only placeholder values in `.env.example`.
- Treat every `VITE_*` value as public: Vite includes those values in browser assets. Supabase project URLs and publishable/anon keys are designed for client use; access must still be protected with row-level security.
- Never put Gemini keys, Supabase secret/service-role keys, database passwords, Vercel tokens, or private signing keys in browser variables, committed files, screenshots, or logs.
- `.gitignore` prevents common local secrets and editor metadata from being newly tracked. It does not remove a file that was already tracked.

## Automated checks

The **Secret scanning** GitHub Actions workflow runs on pushes, pull requests, manual requests, and a weekly schedule. It uses a pinned Gitleaks release verified against a fixed SHA-256 checksum and scans complete fetched Git history with secret values redacted. A detection fails the job. It does not upload a findings report or require a paid scanner account.

For local checks with [Gitleaks](https://github.com/gitleaks/gitleaks):

```sh
gitleaks git . --log-opts="--all --full-history" --redact=100 --no-banner --ignore-gitleaks-allow
gitleaks git . --staged --redact=100 --no-banner --ignore-gitleaks-allow
```

Keep any scan reports private. A filesystem scan may flag legitimate local secrets in ignored `.env.local`; that alone does not mean those files were published. Scanners cannot prove the absence of all confidential information, and dependency audits do not replace credential scanning.

## If a secret was published

1. Revoke or rotate it at its provider and update the private deployment configuration.
2. Identify affected repositories, branches, tags, pull requests, deployments, and logs without reposting the value.
3. Coordinate any necessary history cleanup with collaborators and use explicit force-with-lease checks to avoid overwriting their new work.
4. Review provider access logs and affected permissions. Contact GitHub Support when removal of sensitive cached references is necessary.

See [GitHub's sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
