import { getSupabase } from './supabaseClient';

export const CLOUD_CONSENT_VERSION = '2026-10-28.2';

export async function recordCloudConsent(): Promise<string> {
  const { data, error } = await getSupabase().rpc('record_cloud_consent', { p_policy_version: CLOUD_CONSENT_VERSION });
  if (error || typeof data !== 'string')
    throw new Error('Cloud consent could not be recorded. Retry or choose local-only monitoring.');
  return data;
}

export async function revokeCloudConsent(receipt: string): Promise<void> {
  const { error } = await getSupabase().rpc('revoke_cloud_consent', { p_receipt: receipt });
  if (error)
    throw new Error(
      'Cloud uploads stopped on this device, but server consent revocation could not be confirmed. Retry when connected.',
    );
}
