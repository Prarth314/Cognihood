# Supabase email sender setup

Requested sender: **CogniHood <cognihood@gmail.com>**. The address is recorded in `.env.example` as setup reference; these variables do not configure hosted Supabase automatically. No Gmail password or SMTP credential belongs in Git, Vercel browser variables or chat.

If this mailbox will use Gmail SMTP, enter these values in Supabase Authentication → Emails → SMTP Settings:

| Field | Value |
| --- | --- |
| Sender address | cognihood@gmail.com |
| Sender name | CogniHood |
| SMTP host | smtp.gmail.com |
| Port | 587, using STARTTLS |
| Username | cognihood@gmail.com |
| Password | A Google App Password entered privately in the dashboard |

The owner must enable Google 2-Step Verification and generate an App Password if the account permits it. Never use the ordinary Google account password. Some managed/security-restricted accounts do not offer App Passwords; in that case choose a supported SMTP provider. [Google's App Password instructions](https://support.google.com/accounts/answer/185833).

Still needed: the owner to enter the App Password directly in Supabase, confirm the sender account is under their control, and identify a recipient they authorize for a test confirmation/recovery email. Credential entry is a user handoff. Do not create accounts, send test mail or mark delivery verified without actually completing those actions.

Confirm Site URL is the public https://cognihood.vercel.app/ address and the existing confirmation/recovery redirects point there, rather than to a Vercel-protected alias. Test verification return-to-login, expired links, password reset and spam delivery. Existing production Auth settings were not changed by this documentation update.

Supabase's default sender is restricted and does not replace custom SMTP for general users: [Supabase custom SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp). Gmail availability, sending limits and sender reputation need a separate production-readiness decision; no email-delivery guarantee is made.
