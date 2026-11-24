-- =====================================================================
-- 04_hardening.sql  |  Database hardening (run after 01-03; safe to re-run)
-- Run in Supabase Dashboard > SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Function privileges: nobody except logged-in users can call is_admin(),
--    and trigger helper functions are not callable by API clients at all.
-- ---------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;
revoke execute on function public.bump_content_version() from public, anon, authenticated;
revoke execute on function public.set_updated_at()       from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. URL safety: stored links may only use safe schemes. This blocks
--    javascript: / data: URLs even if the app's own validation is bypassed
--    (e.g. by calling the API directly with a stolen session).
-- ---------------------------------------------------------------------
alter table public.projects drop constraint if exists chk_projects_urls;
alter table public.projects add constraint chk_projects_urls check (
  (github_url is null or github_url ~* '^https?://') and
  (live_url   is null or live_url   ~* '^https?://') and
  (cover_url  is null or cover_url  ~* '^https?://')
);

alter table public.certifications drop constraint if exists chk_cert_url;
alter table public.certifications add constraint chk_cert_url check (
  credential_url is null or credential_url ~* '^https?://'
);

alter table public.publications drop constraint if exists chk_pub_url;
alter table public.publications add constraint chk_pub_url check (
  url is null or url ~* '^https?://'
);

alter table public.profile drop constraint if exists chk_profile_urls;
alter table public.profile add constraint chk_profile_urls check (
  (avatar_url is null or avatar_url ~* '^https?://') and
  (resume_url is null or resume_url ~* '^https?://')
);

alter table public.social_links drop constraint if exists chk_social_url;
alter table public.social_links add constraint chk_social_url check (
  url ~* '^(https?://|mailto:|tel:)'
);

-- ---------------------------------------------------------------------
-- 3. Size / format limits (stops oversized or malformed content)
-- ---------------------------------------------------------------------
alter table public.sections drop constraint if exists chk_sections_limits;
alter table public.sections add constraint chk_sections_limits check (
  slug ~ '^[a-z0-9-]{1,60}$'
  and char_length(coalesce(title, '')) <= 300
  and octet_length(content::text) <= 200000
);

alter table public.projects drop constraint if exists chk_projects_limits;
alter table public.projects add constraint chk_projects_limits check (
  char_length(title) <= 300
  and char_length(coalesce(summary, '')) <= 5000
  and octet_length(files::text) <= 100000
);

alter table public.certifications drop constraint if exists chk_cert_limits;
alter table public.certifications add constraint chk_cert_limits check (
  char_length(title) <= 300 and char_length(issuer) <= 200
);

alter table public.publications drop constraint if exists chk_pub_limits;
alter table public.publications add constraint chk_pub_limits check (
  char_length(title) <= 500 and char_length(coalesce(summary, '')) <= 5000
);

alter table public.site_settings drop constraint if exists chk_settings_limits;
alter table public.site_settings add constraint chk_settings_limits check (
  octet_length(hero::text) <= 50000 and octet_length(footer::text) <= 20000
  and octet_length(theme::text) <= 20000 and octet_length(seo::text) <= 20000
);

-- ---------------------------------------------------------------------
-- 4. Contact form: email format + global flood throttle
--    (max 20 messages per 10 minutes across all visitors)
-- ---------------------------------------------------------------------
alter table public.messages drop constraint if exists chk_messages_email;
alter table public.messages add constraint chk_messages_email check (
  email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
);

create or replace function public.throttle_messages()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (select count(*) from public.messages
      where created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many messages right now. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.throttle_messages() from public, anon, authenticated;

drop trigger if exists trg_throttle_messages on public.messages;
create trigger trg_throttle_messages before insert on public.messages
  for each row execute function public.throttle_messages();

-- ---------------------------------------------------------------------
-- 5. OPTIONAL, do NOT run yet: require MFA (TOTP) for every admin write.
--    Only run this AFTER you have enrolled an authenticator app in the admin
--    site and confirmed you can log in with it, or you will lock yourself out
--    of writes. Supabase has no recovery codes; keep dashboard access safe.
-- ---------------------------------------------------------------------
-- create or replace function public.is_admin()
-- returns boolean
-- language sql stable security definer
-- set search_path = public
-- as $$
--   select exists (select 1 from public.admins where user_id = auth.uid())
--      and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
-- $$;
