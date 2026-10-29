-- Consent must exist before any frame is uploaded, including abandoned sessions.
begin;
alter table public.consent_records
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;
grant select on public.consent_records to service_role;

create or replace function public.record_cloud_consent(p_policy_version text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); receipt uuid;
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if p_policy_version is distinct from '2026-10-28.2' then raise exception 'Unsupported consent version'; end if;
  -- Serialize issuance per user; repeated retries reuse a recent receipt.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 6006));
  select id into receipt from public.consent_records
    where user_id = caller and consent_type = 'CLOUD_FRAME_PROCESSING'
      and policy_version = p_policy_version and revoked_at is null
      and accepted_at > clock_timestamp() - interval '10 seconds'
      and expires_at > clock_timestamp()
    order by accepted_at desc limit 1;
  if receipt is not null then return receipt; end if;
  update public.consent_records set revoked_at = clock_timestamp()
    where user_id = caller and consent_type = 'CLOUD_FRAME_PROCESSING'
      and revoked_at is null and expires_at is not null;
  insert into public.consent_records (user_id, consent_type, policy_version, expires_at)
    values (caller, 'CLOUD_FRAME_PROCESSING', p_policy_version, clock_timestamp() + interval '24 hours')
    returning id into receipt;
  return receipt;
end $$;

create or replace function public.revoke_cloud_consent(p_receipt uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.consent_records set revoked_at = coalesce(revoked_at, clock_timestamp())
    where id = p_receipt and user_id = auth.uid();
end $$;

revoke all on function public.record_cloud_consent(text), public.revoke_cloud_consent(uuid) from public, anon;
grant execute on function public.record_cloud_consent(text), public.revoke_cloud_consent(uuid) to authenticated;
commit;
