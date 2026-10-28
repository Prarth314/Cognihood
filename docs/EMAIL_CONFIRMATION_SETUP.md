# Email confirmation: return to CogniHood, then sign in

The intended flow is: **Create account → Confirm email in the inbox → CogniHood sign-in screen → Enter email and password**. Email verification does not automatically open the authenticated dashboard.

## Hosted Supabase settings

These are dashboard settings, not SQL migrations or Vercel variables. Committing a template or editing a local config file does not update the hosted project's Auth configuration.

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/vrukuoeqxisfaiwmlfot/auth/url-configuration):

- Set **Site URL** to `https://cognihood.vercel.app/`.
- Add the exact production **Redirect URL** `https://cognihood.vercel.app/?auth=confirm`.
- Keep `https://cognihood.vercel.app/` allowed for existing links and password-reset redirects.
- For local development, add `http://localhost:3000/?auth=confirm` and `http://localhost:3000/`. If using `127.0.0.1` or a different port, allow the matching origin and callback explicitly.
- Add another production domain only after verifying ownership. Avoid broad production wildcard rules.

In **Authentication → Email → Confirm signup** (called **Email Templates** in some dashboard versions):

- Use the subject `Confirm your CogniHood email`.
- Paste the HTML from [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html).
- The confirmation button must use `href="{{ .ConfirmationURL }}"`. This verifies the email with Supabase before returning to the requested CogniHood URL.
- A plain link to `{{ .SiteURL }}` only opens the website; it does not verify an account. Do not replace the confirmation button with that link.
- Do not use an `/auth/confirm` server callback copied from a different framework: this application uses a browser callback at `/`.

Keep email/password authentication and email confirmation enabled. Do not disable verification to fix a redirect problem. Custom SMTP must also be configured correctly for messages to arrive, and delivery and resend limits still apply.

## What the application does

Signup and resend requests include the current website origin plus `/?auth=confirm` as `emailRedirectTo`. Supabase verifies the single-use email link and returns the result to that URL. Before analytics or the Supabase client initializes, the application reads the result and removes the confirmation tokens and error parameters from the address bar. It shows a confirmation notice, clears any existing local login session, and waits for an explicit email/password sign-in.

Expired, used, failed, or incomplete links show a useful message with a resend option. Existing links that redirect to the home page with a standard signup token fragment are also recognized. Password-recovery callbacks are left to their separate flow; this change does not implement a missing password-update screen.

## Verify after changing the dashboard

1. Create a new account on the production site with an email address you control.
2. Check that the signup form returns to sign-in and explains the next step.
3. Open the latest confirmation email. The verification link first goes to the project's Supabase Auth endpoint, then returns to `https://cognihood.vercel.app/`.
4. Confirm that the page says **Your email is confirmed**, shows **Sign in**, and does not open the dashboard automatically.
5. Check that no access token or refresh token remains in the address bar. Sign in using the password chosen during registration.
6. Reopening the used link should display an expired/used-link message, not another success claim. If already verified, ordinary sign-in should still work.

Old emails keep their original link and redirect target. After fixing settings, request a fresh confirmation email rather than using one that points at localhost or a retired deployment. Do not paste full confirmation URLs into public issues or logs.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
