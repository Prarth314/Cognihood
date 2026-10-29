# Email confirmation: return to CogniHood, then sign in

The intended flow is: **Create account → Confirm email in the inbox → CogniHood sign-in screen → Enter email and password**. Email verification does not automatically open the authenticated dashboard.

## Hosted Supabase settings

These are dashboard settings, not SQL migrations or Vercel variables. Committing a template or editing a local config file does not update the hosted project's Auth configuration.

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/vrukuoeqxisfaiwmlfot/auth/url-configuration):

- Set **Site URL** to `https://cognihood.vercel.app/`.
- Add the exact production **Redirect URL** `https://cognihood.vercel.app/?auth=confirm`.
- Keep `https://cognihood.vercel.app/` allowed for existing links and password-reset redirects.
- Add `https://cognihood.vercel.app/?auth=recovery` for password recovery. Add the matching local recovery URL when testing locally. If a newly requested URL is not allowlisted, Supabase can fall back to the saved Site URL; the app also recognizes legacy `type=recovery` fragments at `/`.
- For local development, add `http://localhost:3000/?auth=confirm` and `http://localhost:3000/`. If using `127.0.0.1` or a different port, allow the matching origin and callback explicitly.
- Add another production domain only after verifying ownership. Avoid broad production wildcard rules.

In **Authentication → Email → Confirm signup** (called **Email Templates** in some dashboard versions):

- Use the subject `Confirm your CogniHood email`.
- Paste the HTML from [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html).
- The confirmation button must use `href="{{ .ConfirmationURL }}"`. This verifies the email with Supabase before returning to the requested CogniHood URL.
- A plain link to `{{ .SiteURL }}` only opens the website; it does not verify an account. Do not replace the confirmation button with that link.
- Do not use an `/auth/confirm` server callback copied from a different framework: this application uses a browser callback at `/`.

Keep email/password authentication and email confirmation enabled. Do not disable verification to fix a redirect problem. Custom SMTP must also be configured correctly for messages to arrive, and delivery and resend limits still apply.

## Hosted configuration review: October 28, 2026

- Corrected the saved Site URL from the alternate Vercel alias to `https://cognihood.vercel.app/`.
- Added and verified the production home page and `/?auth=confirm` redirect, plus the matching `localhost:3000` and `127.0.0.1:3000` URLs. Existing deployment-alias redirects were retained.
- Added and verified `/?auth=recovery` for production, `localhost:3000`, and `127.0.0.1:3000`. Confirmed the canonical Site URL and recovery allowlist persisted after a dashboard reload.
- Verified that new signups and email confirmation are enabled, email is the only enabled provider, and anonymous sign-ins are disabled.
- Verified that the existing default confirmation email uses `{{ .ConfirmationURL }}`.
- Custom SMTP was not configured at review time. The hosted dashboard requires custom SMTP before editing the confirmation email subject/body. The branded repository template has therefore **not yet been applied to the hosted project**.
- Supabase's default SMTP only delivers to project-team addresses, with a restrictive email quota. Public signup delivery remains dependent on configuring an external mail provider.

To finish SMTP setup, enter the verified sender email, sender name (`CogniHood`), SMTP host, provider-required port, username, and password directly in **Authentication → Emails → SMTP Settings**, then save. Keep the credentials out of Git and browser `VITE_*` variables. If the provider requires a custom sender domain, verify that domain and configure its required DNS records. For the domain-free Gmail development option, follow the instructions below. Only then apply the branded template above and run the real-inbox verification below.

See [Supabase's SMTP restrictions and setup instructions](https://supabase.com/docs/guides/auth/auth-smtp).

## Development email without a custom domain

The website can continue using `https://cognihood.vercel.app/`. A custom website domain is not needed for the confirmation redirect.

For small development tests, an eligible Gmail account can supply SMTP without buying a domain:

| Supabase SMTP field | Value |
| --- | --- |
| Sender email address | The Gmail address you control and authenticate with |
| Sender name | `CogniHood` |
| Host | `smtp.gmail.com` |
| Port | `587` (TLS/STARTTLS) |
| Username | The complete Gmail address |
| Password | A Google app password created for CogniHood |

Enable Google 2-Step Verification and create an app password in your own Google account. App-password availability depends on account policy; some managed accounts, security-key-only configurations, and Advanced Protection accounts do not offer it. Enter the generated app password directly into Supabase. Do not use your normal Gmail password, post the app password in chat, or commit it to the repository. You do not need to enable POP or IMAP to send through SMTP.

This option uses your Gmail address as the sender and remains subject to Google's sending and anti-abuse limits. Use a dedicated transactional provider and an appropriate verified sender domain when preparing for public commercial traffic. This is a documented option, not a statement that Gmail SMTP has already been configured or tested for this project.

References: [Google app passwords](https://support.google.com/accounts/answer/185833), [Gmail SMTP settings](https://support.google.com/mail/answer/7104828).

## What the application does

Signup and resend requests include the current website origin plus `/?auth=confirm` as `emailRedirectTo`. Supabase verifies the single-use email link and returns the result to that URL. Before analytics or the Supabase client initializes, the application reads the result and removes the confirmation tokens and error parameters from the address bar. It shows a confirmation notice, clears any existing local login session, and waits for an explicit email/password sign-in.

Expired, used, failed, or incomplete confirmation links show a useful message with a resend option. Existing links that redirect to the home page with a standard signup token fragment are also recognized.

Password-recovery links have a separate new-password screen. The Supabase client verifies and consumes the recovery session; a matching new password of at least 10 characters is required before `auth.updateUser` is called. Invalid or expired links leave saving disabled. After a successful update, the app ends the local recovery session and returns to password sign-in. The recovery URL marker survives a refresh but does not itself grant access; an authenticated Supabase session is still required for any password change. Normal refresh-token and sign-in behavior remains managed by Supabase.

### Email delivery deferred

Custom SMTP and the branded hosted email template remain deferred at the owner's request. The production redirect changes above are saved. Password-reset and signup-email delivery still depend on the configured provider; implementing their website screens does not remove Supabase's default sender restrictions. Do not save an incomplete SMTP form or commit mail credentials while setup is deferred.

## Verify after changing the dashboard

1. Create a new account on the production site with an email address you control.
2. Check that the signup form returns to sign-in and explains the next step.
3. Open the latest confirmation email. The verification link first goes to the project's Supabase Auth endpoint, then returns to `https://cognihood.vercel.app/`.
4. Confirm that the page says **Your email is confirmed**, shows **Sign in**, and does not open the dashboard automatically.
5. Check that no access token or refresh token remains in the address bar. Sign in using the password chosen during registration.
6. Reopening the used link should display an expired/used-link message, not another success claim. If already verified, ordinary sign-in should still work.

Old emails keep their original link and redirect target. After fixing settings, request a fresh confirmation email rather than using one that points at localhost or a retired deployment. Do not paste full confirmation URLs into public issues or logs.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
