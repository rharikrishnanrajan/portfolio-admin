# SECURITY HARDENING PROMPT (admin site)

You are a senior application-security engineer working in this repo (Vite + React + TypeScript + Tailwind v4 + Supabase). Harden the admin site against realistic attacks. Work in the phases below, in order. Read ADMIN_BUILD_PROMPT.md first for the schema, conventions and rules; they still apply.

## THREAT MODEL (what actually matters here)
Architecture: a static single-page app on Vercel that talks directly to Supabase (Postgres + Auth + Storage) with the public anon/publishable key. There is NO custom backend server. Security is enforced by Postgres Row Level Security (RLS), Supabase Auth and the browser (CSP).
Realistic risks, most to least likely: (1) admin account takeover (weak password, no MFA, phishing); (2) stored XSS through content fields, URLs or uploaded files, which could steal the session token; (3) leaked secrets or keys in Git; (4) vulnerable or malicious npm dependencies; (5) contact-form spam; (6) RLS/storage policy mistakes; (7) availability (free-tier pause).

## WHAT NOT TO BUILD (out of scope; adding these only creates complexity and attack surface)
Load balancers, reverse proxies, API gateways, message queues, background jobs, cron servers, webhooks, circuit breakers, read replicas, Docker, distributed tracing, feature flags, horizontal scaling, connection pooling, graceful shutdown, health-check endpoints, custom caching layers, a custom auth server, a custom session/cookie system, CSRF tokens (the app uses bearer tokens from Supabase, not cookies), and password hashing code (Supabase Auth handles it). Vercel provides CDN, TLS, DDoS protection and scaling; Supabase provides parameterised queries, connection pooling and auth rate limits. If you think one of these is needed, say why in the report and wait. Do not add it.

## RULES
- Do not change any DB table or policy directly. Every SQL change goes into `supabase/migrations/NN_name.sql` for me to review and run. `supabase/04_hardening.sql` already exists; read it and do not duplicate it.
- Never use or request a service_role/secret key. Never print tokens or passwords. Never commit `.env*`.
- Prefer small dependency-free solutions. Allowed new dev dependencies: `vitest`, `@testing-library/react`, `jsdom`. Allowed runtime dependency: `zod`. Nothing else without asking.
- After EACH phase: run `npm run build` (and `npm test` once tests exist), fix errors, append to SECURITY_PROGRESS.md (phase, one line per file "path - created|modified - why", what I should test, open issues), and commit with `git add -A; git commit -m "<phase>"` if git is available. If you stop, SECURITY_PROGRESS.md must let a new session resume.
- PowerShell 5.1: never use && in commands.

## PHASE 1: Read-only audit
Create SECURITY_AUDIT.md. Do not change code yet. Check and report (finding, file:line, severity High/Med/Low, proposed fix):
1. XSS: any use of dangerouslySetInnerHTML, innerHTML, document.write, eval, new Function, or string-built HTML; any stored URL used as href/src without scheme validation (javascript:, data:, vbscript:); any target="_blank" without rel="noopener noreferrer".
2. Injection: every `.or(`, `.filter(`, `.ilike(`, `.like(`, `.rpc(`, `.textSearch(` and every template literal or string concatenation passed into a Supabase query (PostgREST filter injection). Confirm no raw SQL is sent from the client.
3. Secrets: grep the working tree AND git history (`git log --all -p`) for service_role, secret keys, JWT-looking strings starting with eyJ, passwords, and committed .env files. Check .gitignore covers .env and .env.*. Check that the dev-only `__supabase` window hook and any TEMP-DEBUG lines are gone or guarded by import.meta.env.DEV.
4. Uploads: validation by extension/MIME only vs real content; any path built from user input; filenames.
5. Auth: how sessions are stored, idle timeout, sign-out behaviour, error messages that reveal whether an email exists, any logging of credentials or tokens.
6. Error handling: swallowed errors, raw error text shown to users, missing React error boundary, success toasts shown before DB confirmation.
7. Dependencies: run `npm audit` and `npm ls` and report vulnerabilities and unused packages.
8. Build output: any source maps shipped to production, console.* calls left in production code.

## PHASE 2: XSS and input validation
1. Create `src/lib/safeUrl.ts`: `safeUrl(value): string | null` allowing only http:, https:, mailto: and tel: (parse with `new URL`, reject everything else, reject strings with control characters). Use it wherever a stored URL is rendered as a link or image source, including previews in the admin.
2. Create `src/lib/schemas.ts` with zod schemas for every table the admin writes, with limits matching `supabase/04_hardening.sql` (lengths, URL schemes via safeUrl, slug `^[a-z0-9-]{1,60}$`, email format, dates). Validate with these schemas in `src/lib/db.ts` (or the single write path) before every insert/update/upsert, and show field-level errors in the forms.
3. Add `rel="noopener noreferrer"` to every external link.
4. Remove every use of dangerouslySetInnerHTML or innerHTML. If rich text is needed, render plain text with line breaks only.
5. Rewrite any Supabase query that interpolates user input into a filter string to use `.eq`, `.in`, or escaped parameters.

## PHASE 3: File upload security
In `src/lib/storage.ts`:
1. Verify real file content by magic bytes before upload (PDF `%PDF-`; PNG; JPEG `FF D8 FF`; WebP `RIFF....WEBP`; AVIF `ftyp` brand; DOCX/XLSX/PPTX are ZIP `PK`) and make sure the extension matches the detected type. Reject on mismatch. Set `contentType` from the detected type, never from `file.type`.
2. Keep allow-lists per bucket exactly as in ADMIN_BUILD_PROMPT.md. No SVG, HTML, JS or archives.
3. Generate storage names as `<uuid>-<safe-slug>.<ext>`; strip path separators and dots-only segments; never use raw user filenames in paths.
4. Enforce size limits before reading the file into memory.
5. Confirm every delete/replace removes the old object (no orphans).

## PHASE 4: Authentication, sessions and MFA
1. Idle timeout: sign out after 30 minutes without user interaction (mouse, key, touch), with a 1-minute warning toast. Also sign out when the tab was hidden for more than 2 hours.
2. Add a "Sign out of all devices" button (`supabase.auth.signOut({ scope: 'global' })`).
3. Login page: generic error text ("Email or password is incorrect"), disable the button during the request, and add exponential backoff on the client after 3 failures (cosmetic only; the real limit is server-side). Never log credentials.
4. Add `/security` page (new sidebar item) to enrol a TOTP authenticator using `supabase.auth.mfa.enroll({ factorType: 'totp' })`, show the QR code, verify with a 6-digit code (`challenge` + `verify`), list factors, and allow removing one only after a fresh verification. Show a clear warning that Supabase has no recovery codes.
5. Add an `RequireMfa` check after `RequireAdmin`: use `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. If a factor is enrolled but the session is aal1, send the user to a code-entry screen. Do not force enrolment yet (a flag `VITE_REQUIRE_MFA=true` can turn it on later).
6. Do NOT apply the optional MFA block in `supabase/04_hardening.sql`. I will enable it myself after verifying MFA login.

## PHASE 5: Errors, timeouts, retries and write safety
1. Add a top-level React ErrorBoundary with a friendly fallback (no stack traces, no raw error text).
2. Create `src/lib/errors.ts` mapping Supabase/PostgREST errors and HTTP statuses to friendly messages: 401 (session expired: sign out), 403 (not allowed), 404, 409/23505 (already exists, for example duplicate slug), 413 (file too large), 429 (too many requests: show wait message), 5xx (try again). Use it everywhere errors are shown.
3. Reads: 15-second timeout via AbortController and up to 3 retries with exponential backoff and jitter on network errors and 5xx/429 only. Writes: no automatic retry unless idempotent (upsert by id); disable submit buttons while a request is in flight so double-clicks cannot create duplicates.
4. Optimistic concurrency on edits: when updating a row, also match the `updated_at` value that was loaded (`.eq('updated_at', loadedValue)`); if no row returns, show "This item was changed elsewhere. Reload and try again."
5. Production build must not leak details: no source maps, and drop `console.*` and `debugger` statements (use the option correct for the installed Vite version).

## PHASE 6: Tests and security smoke test
1. Add Vitest with unit tests for: safeUrl (accepts https/mailto/tel, rejects javascript:, data:, vbscript:, mixed-case and whitespace tricks), the zod schemas, the magic-byte checker, safe filename generation, and the error mapper.
2. Create `scripts/security-smoke.ps1` (Windows PowerShell 5.1, uses `curl.exe`, reads the URL and anon key from `.env.local`, prints PASS/FAIL per line, never prints keys). It must verify with the ANON key that: reading projects/sections/skill_domains works; reading `public_profile` works; reading the `profile` table returns nothing or is denied; reading `messages` is denied/empty; reading `admins` returns nothing; inserting/updating/deleting projects is refused; inserting into `admins` is refused; uploading to both storage buckets is refused; calling the `is_admin` RPC is refused; inserting a valid contact message succeeds; inserting a message with an invalid email is refused. Exit non-zero on any failure.
3. Add npm scripts: `typecheck` (`tsc -b`), `test`, `audit` (`npm audit --audit-level=high`). Make sure `.github/workflows/ci.yml` passes with them.

## PHASE 7: Final report
Update SECURITY_AUDIT.md with a table: finding, severity, status (fixed / not applicable / needs my action) and the file that fixes it. Then give me a numbered checklist of what I must do myself in the Supabase and Vercel dashboards (disable signups, CAPTCHA, auth rate limits, password length, MFA, redirect URLs, uptime monitor) and how to verify each. Do not claim something works unless you tested it; list what needs my testing.
