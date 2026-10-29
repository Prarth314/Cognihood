export function validatePublicEnvironment(environment) {
  for (const [name, value] of Object.entries(environment)) {
    if (!name.startsWith('VITE_') || !value) continue;
    if (/GEMINI|SERVICE_ROLE|PASSWORD|PRIVATE_KEY|SECRET|VERCEL_TOKEN/i.test(name))
      throw new Error(`Server-only credential name is not allowed in browser environment: ${name}`);
    if (/^sb_secret_|^AIza[\w-]{30,}|^gh[pousr]_|^github_pat_/.test(value))
      throw new Error(`Private credential detected in browser environment: ${name}`);
    if (value.startsWith('eyJ')) {
      try {
        const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
        if (payload.role === 'service_role') throw new Error('private-role');
      } catch (error) {
        if (error.message === 'private-role')
          throw new Error(`Privileged Supabase credential is not allowed in browser environment: ${name}`);
      }
    }
  }
}
