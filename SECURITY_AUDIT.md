# SECURITY AUDIT REPORT (Phase 1 Read-Only Audit)

**Date:** 2026-11-24  
**Target:** Admin Site (`portfolioadmin/admin`)  
**Stack:** Vite 8.3 + React 19 + TypeScript + Tailwind CSS v4 + Supabase (@supabase/supabase-js 2.119)  
**Scope:** Read-only security audit of codebase, architecture, dependencies, build artifacts, git history, and database policies.

---

## Executive Summary

The application is a client-side Single-Page Application (SPA) communicating directly with Supabase via PostgREST and Supabase Storage using the public anon key. Authentication and authorization are enforced by Supabase Auth and PostgreSQL Row Level Security (RLS) policies.

While baseline security practices are observed (no secret keys in git history, clean `npm audit`, parameterized queries using `.eq()`, and all external links currently carrying `rel="noopener noreferrer"`), the audit identified critical and medium severity vulnerabilities that must be hardened in subsequent phases:
1. **Stored XSS Vector via URLs:** Stored database URLs and uploaded file links are bound to `<a href>` and `<img src>` elements without runtime URL scheme sanitization.
2. **Insecure File Upload Handling:** File uploads rely solely on client-reported MIME types and file extensions with no magic-byte verification, and orphaned files accumulate when images/documents are removed or replaced.
3. **Session & Authentication Gaps:** Lack of session idle timeout (30-minute inactivity), no tab-visibility sign-out, no global sign-out capability, and absence of Multi-Factor Authentication (TOTP).
4. **Information Disclosure & Error Handling:** Unhandled/raw database constraint errors displayed directly to users in toasts; unmounted `ErrorBoundary`; and storage deletion errors silently swallowed.
5. **Build Optimization & Concurrency:** Production bundles retain `console.*` statements, and concurrent database writes lack optimistic concurrency checks against `updated_at`.

---

## Detailed Audit Findings

### 1. Cross-Site Scripting (XSS)

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **XSS-01** | **Unvalidated stored URLs rendered in `<a href>` and `<img src>`**<br>Stored URLs from Supabase (`file.url`, `credentialUrl`, `resume_url`, `item.url`, `project.live_url`, `project.cover_url`, `img.url`) are rendered directly into HTML attributes without client-side protocol scheme verification. If malicious payloads (e.g. `javascript:...` or `data:text/html,...`) exist in the database or bypass database checks, clicking or loading them executes arbitrary JavaScript in the context of the authenticated admin session. | `src/components/ui/FileUpload.tsx:137`<br>`src/components/ui/ImageUpload.tsx:85`<br>`src/pages/Certifications.tsx:383, 523`<br>`src/pages/Profile.tsx:348, 552`<br>`src/pages/Projects.tsx:150, 225`<br>`src/pages/Publications.tsx:365`<br>`src/pages/Sections.tsx:620` | **High** | Implement `src/lib/safeUrl.ts` with strict protocol allow-listing (`http:`, `https:`, `mailto:`, `tel:` via `new URL()`), rejecting control characters, whitespace tricks, and invalid schemes. Wrap every rendered `href` and `src` with `safeUrl()`. |
| **XSS-02** | **Incomplete URL validation in `isValidUrl`**<br>`isValidUrl` validates solely with regex `/^https?:\/\/.+/i`. It does not parse via standard `URL()`, fails to filter ASCII control characters, and does not permit valid `mailto:` or `tel:` schemes used in social links (`Profile.tsx:174`). Furthermore, `Sections.tsx` (cards custom section) completely omits URL validation on its `url` field before saving to the DB. | `src/lib/validation.ts:5-9`<br>`src/pages/Sections.tsx:593` | **Medium** | Replace regex with `safeUrl()` validation; incorporate Zod schema validation in write paths enforcing RFC 3986 compliance. |
| **XSS-03** | **Mailto link parameter injection**<br>`selected.email` and `selected.subject` are interpolated into `mailto:` link without sanitizing CRLF control characters in the email field. | `src/pages/Messages.tsx:221` | **Low** | Validate `selected.email` against safe email format and encode parameters using `encodeURIComponent`. |
| **XSS-04** | **Dangerous HTML sinks**<br>Audited all source files for `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval()`, and `new Function()`. None are present. | Whole `src/` tree | **Informational** (Pass) | Maintain policy: prohibit raw HTML rendering and dynamic script evaluation. Plain text with CSS `whitespace-pre-wrap` is used. |
| **XSS-05** | **`target="_blank"` without `rel="noopener noreferrer"`**<br>Audited all existing external links. All anchor tags with `target="_blank"` currently include `rel="noopener noreferrer"`. | `src/components/ui/FileUpload.tsx:139`<br>`src/pages/Certifications.tsx:385, 525`<br>`src/pages/Profile.tsx:350, 554`<br>`src/pages/Projects.tsx:227`<br>`src/pages/Publications.tsx:367` | **Informational** (Pass) | Ensure all future external links enforce `rel="noopener noreferrer"`. |

---

### 2. Injection & Database Query Safety

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **INJ-01** | **PostgREST filter injection review**<br>Audited codebase for `.or(`, `.filter(`, `.ilike(`, `.like(`, `.rpc(`, and `.textSearch(`. All PostgREST queries use discrete parameterized `.eq('column', value)` statements. No user input is concatenated into filter strings. | `src/lib/useCrud.ts`<br>`src/pages/*.tsx` | **Informational** (Pass) | Maintain parameterized query builder usage; do not interpolate raw template strings into PostgREST filter clauses. |
| **INJ-02** | **Raw SQL execution from client**<br>Audited for raw SQL statements or administrative RPC endpoints. None are invoked from the frontend client. | Whole `src/` tree | **Informational** (Pass) | Keep database mutations strictly governed by PostgREST and RLS policies. |
| **INJ-03** | **Client-side table identifier in `useCrud`**<br>`useCrud` accepts a `table` string parameter: `supabase.from(table)`. In the current codebase, callers pass hardcoded string literals (`'certifications'`, `'education'`, etc.). | `src/lib/useCrud.ts:33, 71, 107` | **Low** | Constrain `table` parameter type to an explicit union of allowable database table names. |

---

### 3. Secrets & Source Control Hygiene

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **SEC-01** | **Git history and working tree secret scan**<br>Executed git log searches (`git log --all -p`) across all commits for `service_role`, secret keys, JWT-like strings (`eyJ`), passwords, and environment files. No secret keys or private JWTs were ever committed. | Git commit history | **Informational** (Pass) | Continue enforcing secret prevention. Never commit `.env` or reference `service_role`. |
| **SEC-02** | **`.gitignore` coverage for environment credentials**<br>Verified `.gitignore` rules against `.env`, `.env.local`, and `.env.*`. `git check-ignore` confirms `.env.local` is ignored (`.gitignore:24:*.local` and `.gitignore:17:.env`). | `.gitignore:17-19, 24` | **Informational** (Pass) | Maintain existing ignore rules. |
| **SEC-03** | **Leftover debug lines / hooks**<br>Searched for `__supabase` window assignment and `// TEMP-DEBUG` markers. No active debug hooks or window exposures exist in the codebase. | `src/` tree | **Informational** (Pass) | Ensure no dev-only objects are attached to `window`. |

---

### 4. File Upload Security

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **UPL-01** | **File validation relies only on extension and client MIME type**<br>`validateFile` evaluates `mimeMatch || extMatch`. An attacker can upload an arbitrary file (e.g., SVG containing embedded scripts, HTML, or executable payload) by spoofing `file.type` or using an allowed extension. No magic-byte verification is performed. | `src/lib/storage.ts:73-103` | **High** | Implement real content verification by inspecting file header magic bytes before upload: PDF (`%PDF-`), PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), WebP (`RIFF...WEBP`), AVIF (`ftyp` brand), and Office docs (`PK` ZIP headers). Reject on mismatch and set `contentType` from detected bytes rather than `file.type`. Disallow SVG, HTML, and JS. |
| **UPL-02** | **Predictable timestamp filenames without UUID entropy**<br>`safeName` generates names using `Date.now() + cleanBase + ext`. This is predictable and lacks cryptographic randomness. | `src/lib/storage.ts:54-67` | **Medium** | Generate filenames as `<crypto-uuid>-<safe-slug>.<ext>`, strip any leading/trailing path separators, and strictly sanitize the extension. |
| **UPL-03** | **Unsanitized slug in storage paths**<br>Gallery upload builds storage paths using `sections/${editingContent.slug}/${safeName(file.name)}`. If `slug` contains special characters or directory traversal characters, storage paths could be corrupted. | `src/pages/Sections.tsx:356` | **Medium** | Enforce strict regex validation (`^[a-z0-9-]{1,60}$`) on slugs before using them in storage paths. |
| **UPL-04** | **Orphaned files on image replacement and removal**<br>`ImageUpload.tsx` clears local state on remove without calling `removeFile()`. Replacing an image uploads the new file but leaves the previous asset orphaned in the Supabase bucket. Similarly, `Profile.tsx` (resume removal) sets `resume_url: null` without deleting the PDF from storage. | `src/components/ui/ImageUpload.tsx:55-56, 68`<br>`src/pages/Profile.tsx:358` | **Medium** | Ensure replacing or removing media triggers deletion of the old object in Supabase Storage (`removeFile`), avoiding unbounded storage waste and ghost assets. |

---

### 5. Authentication, Sessions and Multi-Factor Auth (MFA)

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **AUTH-01** | **Session stored in `localStorage` without idle timeout**<br>Supabase client stores session tokens in browser `localStorage`. No idle timeout mechanism exists to sign out users after period of inactivity. If an admin leaves an active session unattended, the account remains vulnerable to local or physical takeover. | `src/lib/supabase.ts:13`<br>`src/lib/auth.tsx` | **High** | Implement a 30-minute idle inactivity timeout listener (mouse, keyboard, touch) with a 1-minute warning toast. Additionally, trigger sign-out if the browser tab has been hidden (`document.visibilityState === 'hidden'`) for more than 2 hours. |
| **AUTH-02** | **Absence of Multi-Factor Authentication (MFA)**<br>The admin application relies solely on single-factor password authentication. Supabase Auth MFA (TOTP) is not enrolled or checked. | `src/lib/auth.tsx`<br>`src/components/RequireAdmin.tsx` | **High** | Add a `/security` page to enroll TOTP authenticators via `supabase.auth.mfa.enroll`, display QR code, verify challenge, and list/unenroll factors. Add an `aal` level check in authentication routing. |
| **AUTH-03** | **No global sign-out capability**<br>`signOut` in `auth.tsx` invokes `supabase.auth.signOut()` without specifying `{ scope: 'global' }`. The admin has no option to invalidate sessions across other devices. | `src/lib/auth.tsx:52-54` | **Low** | Provide a "Sign out of all devices" option calling `supabase.auth.signOut({ scope: 'global' })`. |
| **AUTH-04** | **Verbose login errors / Fallback to raw error strings**<br>`friendlyError()` returns `raw` by default. Descriptive error messages from the backend could assist user enumeration or expose auth configuration details. | `src/pages/Login.tsx:17` | **Medium** | Standardize login failure messages to a generic string: `"Email or password is incorrect"`, suppressing raw backend errors. |
| **AUTH-05** | **Lack of client-side login throttling/backoff**<br>`Login.tsx` does not throttle rapid repeated submissions on the client after multiple failures. | `src/pages/Login.tsx:30-38` | **Low** | Introduce client-side exponential backoff after 3 failed login attempts. |

---

### 6. Error Handling, Reliability and Concurrency

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **ERR-01** | **Raw database and PostgREST errors exposed to end users**<br>Every page catches mutation errors and feeds raw `err.message` directly into `toast.error(msg)`. This leaks database constraint names (e.g., `chk_projects_urls`), column names, and PostgREST status codes directly to the UI. | `src/pages/*.tsx`<br>`src/lib/useCrud.ts:41` | **Medium** | Create centralized `src/lib/errors.ts` mapping HTTP statuses and PostgreSQL error codes (401, 403, 404, 409/23505, 413, 429, 5xx) to clear, friendly user messages. |
| **ERR-02** | **Storage deletion errors silently swallowed**<br>`deleteProjectStorage`, `deleteProjectCover`, `deleteProjectDocument`, and component cleanup routines catch storage deletion failures and log `console.warn` without bubbling errors or notifying the user. The UI then reports successful project/file deletion even when storage cleanup failed. | `src/lib/projectStorage.ts:29, 36, 57, 64, 91, 98, 111`<br>`src/pages/Certifications.tsx:58`<br>`src/pages/ProjectEditor.tsx:242` | **Medium** | Bubble storage errors or surface a clear warning toast informing the user if database records were removed but underlying storage files failed to delete. |
| **ERR-03** | **React Error Boundary unmounted & exposes raw stack/message**<br>`ErrorBoundary.tsx` exists but is not rendered in `main.tsx` or `App.tsx`. In addition, line 38 renders raw `this.state.error.message` directly in the UI. | `src/components/ErrorBoundary.tsx:24, 38`<br>`src/main.tsx`<br>`src/App.tsx` | **Medium** | Mount `ErrorBoundary` at the application root (`main.tsx` / `App.tsx`) with a generic fallback UI that avoids exposing raw messages or stack traces. |
| **ERR-04** | **Lack of optimistic concurrency control**<br>When updating rows in `useCrud.ts`, `Settings.tsx`, `Theme.tsx`, and `Profile.tsx`, updates do not match the loaded `updated_at` timestamp. In `useCrud.ts:100`, `updated_at` is explicitly stripped. Concurrent edits by multiple sessions will silently overwrite each other. | `src/lib/useCrud.ts:100, 109`<br>`src/pages/Settings.tsx`<br>`src/pages/Profile.tsx` | **Medium** | Include `.eq('updated_at', loadedUpdatedAt)` on row updates. If 0 rows return, display `"This item was changed elsewhere. Reload and try again."` |
| **ERR-05** | **Absence of read timeouts and network retry logic**<br>Database queries do not pass an `AbortSignal` with a timeout (e.g. 15s). Transient network drops or 5xx/429 errors fail immediately without exponential backoff retry. | `src/lib/useCrud.ts`<br>`src/pages/*.tsx` | **Low** | Implement 15-second AbortController timeout on reads and up to 3 retries with exponential backoff on network/5xx/429 errors. Writes must remain non-retried unless idempotent. |

---

### 7. Dependencies & Package Audit

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **DEP-01** | **Vulnerability scan**<br>Ran `npm audit`. Found 0 vulnerabilities across installed production and development dependencies. | `package.json` | **Informational** (Pass) | Keep dependencies updated; enforce `npm audit --audit-level=high` in CI pipeline. |
| **DEP-02** | **Misplaced build dependency**<br>`@tailwindcss/vite` is listed under `dependencies` rather than `devDependencies`. | `package.json:16` | **Low** | Move `@tailwindcss/vite` to `devDependencies` during next dependency maintenance. |
| **DEP-03** | **Missing security and testing dependencies**<br>Application currently lacks schema validation library (`zod`) and unit testing frameworks (`vitest`, `@testing-library/react`, `jsdom`). | `package.json` | **Medium** | Install `zod` for input validation (Phase 2) and `vitest` with test harness (Phase 6). |

---

### 8. Build Configuration & Information Leakage

| ID | Finding | Location | Severity | Proposed Fix |
|---|---|---|---|---|
| **BLD-01** | **Production bundles retain `console.*` statements**<br>`vite.config.ts` does not configure esbuild to strip `console` or `debugger` statements. Production assets in `dist/assets/` contain `console.warn` and `console.error` calls. | `vite.config.ts`<br>`dist/assets/*.js` | **Low** | Configure `esbuild: { drop: ['console', 'debugger'] }` in `vite.config.ts` for production builds. |
| **BLD-02** | **Production source maps configuration**<br>Vite defaults to `sourcemap: false` for production builds, and no `.map` files were present in `dist/`. However, `sourcemap: false` is not explicitly declared in `vite.config.ts`. | `vite.config.ts` | **Low** | Explicitly declare `build: { sourcemap: false }` in `vite.config.ts`. |

---

## Action Plan: Security Hardening Roadmap

Following this read-only audit, security hardening proceeds in sequential phases:

- **Phase 2 (XSS & Input Validation):**
  - Create `src/lib/safeUrl.ts` for strict protocol allow-listing (`http:`, `https:`, `mailto:`, `tel:`).
  - Create `src/lib/schemas.ts` with Zod validation matching `04_hardening.sql` constraints for all mutation paths.
  - Wrap all rendered links and media previews with `safeUrl()`.
- **Phase 3 (File Upload Hardening):**
  - Implement magic-byte verification in `src/lib/storage.ts` for PNG, JPEG, WebP, AVIF, PDF, and Office files.
  - Set `contentType` strictly from detected magic bytes.
  - Generate filenames as `<uuid>-<safe-slug>.<ext>` and purge orphaned assets on removal/replacement.
- **Phase 4 (Authentication, Sessions & MFA):**
  - Implement 30-minute idle timeout + 2-hour hidden tab sign-out.
  - Add global sign-out ("Sign out of all devices").
  - Build `/security` page for TOTP authenticator enrollment and validation; enforce MFA assurance checks.
- **Phase 5 (Error Handling, Write Safety & Concurrency):**
  - Mount top-level `ErrorBoundary` with a generic fallback UI.
  - Implement `src/lib/errors.ts` for user-friendly error translation.
  - Implement read timeouts (15s), exponential retries on transient errors, and optimistic concurrency on row edits via `updated_at`.
  - Configure Vite to drop `console.*` and disable source maps in production.
- **Phase 6 (Testing & Smoke Test Script):**
  - Install Vitest and add unit tests for `safeUrl`, Zod schemas, magic bytes, safe filenames, and error mapping.
  - Build `scripts/security-smoke.ps1` to verify Supabase RLS policies and role restrictions with the anon key.
- **Phase 7 (Final Report & Verification Checklist):**
  - Deliver final status matrix and Supabase/Vercel dashboard security checklist.

---

## Phase 7: Final Status Matrix

**Updated:** 2026-11-24 (after Phases 2–6 complete)

| ID | Finding | Severity | Status | Fixed By |
|---|---|---|---|---|
| **XSS-01** | Unvalidated stored URLs in `<a href>` / `<img src>` | High | ✅ Fixed | `src/lib/safeUrl.ts` — `safeUrl()` / `safeImageUrl()` applied to all rendered links and image sources across all pages and components |
| **XSS-02** | Incomplete URL validation in `isValidUrl` | Medium | ✅ Fixed | `src/lib/validation.ts` — rewrote `isValidUrl()` using `safeUrl()`; `src/lib/schemas.ts` — Zod schemas validate all URL fields on write |
| **XSS-03** | Mailto link parameter injection | Low | ✅ Fixed | `src/pages/Messages.tsx` — `safeUrl()` applied to reply mailto link; `encodeURIComponent` encoding applied |
| **XSS-04** | Dangerous HTML sinks | Informational | ✅ Pass (no action needed) | No `dangerouslySetInnerHTML` or `innerHTML` present |
| **XSS-05** | `target="_blank"` without `rel="noopener noreferrer"` | Informational | ✅ Pass (no action needed) | All existing external links already carry `rel="noopener noreferrer"` |
| **INJ-01** | PostgREST filter injection | Informational | ✅ Pass (no action needed) | All queries use parameterized `.eq()` calls |
| **INJ-02** | Raw SQL from client | Informational | ✅ Pass (no action needed) | No raw SQL executed from frontend |
| **INJ-03** | Client-side table identifier in `useCrud` | Low | ✅ Fixed | `src/lib/useCrud.ts` — `table` parameter constrained to `TableName` union type via `src/lib/db.ts` schema registry |
| **SEC-01** | Git history secret scan | Informational | ✅ Pass (no action needed) | No secrets ever committed |
| **SEC-02** | `.gitignore` coverage | Informational | ✅ Pass (no action needed) | `.env.local` correctly ignored |
| **SEC-03** | Leftover debug lines | Informational | ✅ Pass (no action needed) | No debug hooks present |
| **UPL-01** | File validation by extension/MIME only | High | ✅ Fixed | `src/lib/storage.ts` — `detectFileType()` verifies magic bytes for PDF, PNG, JPEG, WebP, AVIF, and Office OpenXML; `contentType` set from detected bytes; SVG/HTML/JS rejected |
| **UPL-02** | Predictable timestamp filenames | Medium | ✅ Fixed | `src/lib/storage.ts` — `safeName()` generates `<uuid>-<safe-slug>.<ext>` using `crypto.randomUUID()` |
| **UPL-03** | Unsanitized slug in storage paths | Medium | ✅ Fixed | `src/lib/storage.ts` — `sanitizeStoragePath()` strips traversal segments; `src/pages/Sections.tsx` — slug validated against `^[a-z0-9-]{1,60}$` before use in storage path |
| **UPL-04** | Orphaned files on replacement/removal | Medium | ✅ Fixed | `src/components/ui/ImageUpload.tsx` — calls `removeFile()` on old object before replacing or removing; `src/pages/Profile.tsx` — deletes old resume PDF on replacement/removal |
| **AUTH-01** | No session idle timeout | High | ✅ Fixed | `src/lib/auth.tsx` — 30-minute inactivity timeout with 1-minute warning toast; 2-hour hidden-tab sign-out |
| **AUTH-02** | No MFA | High | ✅ Fixed | `src/pages/Security.tsx` — TOTP enrolment/unenrolment with QR code; `src/components/RequireMfa.tsx` — AAL2 enforcement when factor enrolled; `src/components/MfaChallenge.tsx` — challenge screen |
| **AUTH-03** | No global sign-out | Low | ✅ Fixed | `src/lib/auth.tsx` — `signOutAll()` added with `{ scope: 'global' }`; `src/components/Layout.tsx` — "Sign out of all devices" button; `src/pages/Security.tsx` — global sign-out action |
| **AUTH-04** | Verbose login errors | Medium | ✅ Fixed | `src/pages/Login.tsx` — all login failures return generic `"Email or password is incorrect"` |
| **AUTH-05** | No client-side login throttle | Low | ✅ Fixed | `src/pages/Login.tsx` — exponential backoff lockout after 3 consecutive failures with countdown timer |
| **ERR-01** | Raw DB errors shown to users | Medium | ✅ Fixed | `src/lib/errors.ts` — `friendlyErrorMessage()` maps all Supabase/PostgREST/PostgreSQL error codes to safe messages; integrated in all pages and hooks |
| **ERR-02** | Storage deletion errors swallowed | Medium | ✅ Fixed | `src/lib/projectStorage.ts`, `src/pages/Certifications.tsx`, `src/pages/ProjectEditor.tsx` — storage errors surfaced as warning toasts |
| **ERR-03** | ErrorBoundary unmounted / exposes raw stack | Medium | ✅ Fixed | `src/components/ErrorBoundary.tsx` — redesigned with generic fallback; `src/main.tsx` — mounted at application root |
| **ERR-04** | No optimistic concurrency on writes | Medium | ✅ Fixed | `src/lib/db.ts` — `updateRow()` matches `updated_at`; `src/lib/useCrud.ts`, `src/pages/ProjectEditor.tsx`, `src/pages/Settings.tsx`, `src/pages/Profile.tsx`, `src/pages/Theme.tsx`, `src/pages/About.tsx`, `src/pages/Sections.tsx` — all edits include `updated_at` check |
| **ERR-05** | No read timeouts or network retry | Low | ✅ Fixed | `src/lib/db.ts` — `withReadRetry()`: 15-second AbortController timeout; 3 retries with exponential backoff and jitter on network errors / 5xx / 429 |
| **DEP-01** | npm audit vulnerabilities | Informational | ✅ Pass (0 vulnerabilities) | `npm audit --audit-level=high` added to CI via `npm run audit` |
| **DEP-02** | `@tailwindcss/vite` in dependencies | Low | ⚠️ Needs your action | Move to `devDependencies` during next scheduled dependency maintenance |
| **DEP-03** | Missing `zod` and test dependencies | Medium | ✅ Fixed | `zod` added as runtime dep; `vitest`, `@testing-library/react`, `jsdom`, `@vitest/coverage-v8` added as devDependencies |
| **BLD-01** | `console.*` in production bundles | Low | ✅ Fixed | `vite.config.ts` — Rolldown compress options `dropConsole: true`, `dropDebugger: true` |
| **BLD-02** | Source maps not explicitly disabled | Low | ✅ Fixed | `vite.config.ts` — `build: { sourcemap: false }` explicitly declared |

### New Finding: DB-01 (discovered in Phase 6 smoke test)

| ID | Finding | Severity | Status | Detail |
|---|---|---|---|---|
| **DB-01** | **`chk_messages_email` constraint not enforced**<br>The smoke test confirmed the anon role can insert a contact message with an invalid email (e.g. `not-an-email`) and receive HTTP 201. This indicates the `supabase/04_hardening.sql` migration has not been applied to the production database. The check constraint `chk_messages_email` does not exist. | **High** | ⚠️ Needs your action — run migration | Apply `supabase/04_hardening.sql` in the Supabase dashboard SQL editor. After applying, re-run `scripts/security-smoke.ps1` to confirm the constraint is enforced (the last check will flip to PASS). |

---

## Phase 7: Supabase & Vercel Dashboard Checklist

> [!IMPORTANT]
> These items **cannot be completed by code changes** — they require actions in the Supabase and Vercel dashboards. Work through each item in order. After completing all items, re-run `scripts/security-smoke.ps1` and verify all checks PASS.

---

### Supabase Dashboard Actions

**1. Apply `04_hardening.sql` migration (Critical)**
- Go to: **Supabase Dashboard → SQL Editor**
- Open `supabase/04_hardening.sql` from this repo
- Paste the entire contents and click **Run**
- **Verify:** Re-run `scripts/security-smoke.ps1`. The "INSERT messages invalid email" check must flip to PASS.

**2. Set a strong password policy**
- Go to: **Authentication → Policies → Password**
- Set minimum password length to **12 characters**
- Enable **"Prevent use of leaked passwords"** (HaveIBeenPwned integration)
- **Verify:** Try creating a new auth user with a weak password — it should be rejected.

**3. Disable new user sign-ups (admin-only site)**
- Go to: **Authentication → Settings → User Signups**
- Toggle **"Enable Signups"** to **OFF**
- **Verify:** Attempt to call `supabase.auth.signUp()` from the browser console — it should return an error.

**4. Enable CAPTCHA on the Auth endpoint**
- Go to: **Authentication → Settings → Bot and Abuse Protection**
- Enable **hCaptcha** or **Turnstile** and configure your site key
- **Verify:** The login endpoint requires CAPTCHA challenge for unauthenticated requests.

**5. Confirm Auth rate limits are configured**
- Go to: **Authentication → Settings → Rate Limits**
- Confirm: sign-in attempts are limited (default: 5 per 10 seconds per IP)
- Confirm: OTP / magic-link sends are limited
- **Verify:** These are on by default; confirm they have not been disabled.

**6. Set allowed Redirect URLs (prevent open redirects)**
- Go to: **Authentication → URL Configuration**
- Under **"Redirect URLs"**, ensure only your production domain is listed: `https://<your-vercel-domain>.vercel.app/**`
- Remove any `http://localhost` entries before going live
- **Verify:** A `redirect_to` to an arbitrary domain in a Supabase Auth link must be rejected.

**7. Enroll TOTP MFA on the admin account**
- In the admin app, go to **Settings → Security** (`/security`)
- Click **"Enrol Authenticator"**, scan the QR code with an authenticator app
- Enter the 6-digit verification code and confirm
- **Verify:** Sign out and sign back in — you should be prompted for the TOTP code before accessing any page.

**8. Review RLS policies for all tables**
- Go to: **Table Editor → [each table] → Policies**
- Confirm:
  - `profile`, `site_settings` — anon can SELECT nothing (confirmed by smoke test ✅)
  - `messages` — anon can INSERT only (confirmed by smoke test ✅), not SELECT/UPDATE/DELETE
  - `projects`, `sections`, `skill_domains` — anon SELECT only on visible rows (confirmed by smoke test ✅)
  - `admins` — anon can do nothing (confirmed by smoke test ✅)
- **Verify:** Smoke test passes all READ/WRITE checks.

**9. Verify Storage bucket policies**
- Go to: **Storage → Buckets → `portfolio` → Policies**
- Confirm: SELECT (read) is public; INSERT/UPDATE/DELETE require `auth.role() = 'authenticated'` AND `is_admin()`
- Do the same for **`project-documents`**
- **Verify:** Smoke test passes both "UPLOAD bucket (anon denied)" checks ✅ (already confirmed).

**10. Set up an uptime monitor**
- In Supabase: **Settings → Usage** to watch database connections and storage usage
- Recommended: Use an external uptime monitor (e.g. BetterUptime, UptimeRobot) pointing to your Vercel deployment URL
- **Verify:** You receive an alert within 5 minutes of your site going offline.

---

### Vercel Dashboard Actions

**11. Set production environment variables**
- Go to: **Vercel Project → Settings → Environment Variables**
- Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set for the **Production** environment only
- Ensure no `service_role` key is present in any environment
- **Verify:** The app loads and connects to Supabase on the production URL.

**12. Enable Vercel Deployment Protection**
- Go to: **Vercel Project → Settings → Deployment Protection**
- Enable **"Vercel Authentication"** for preview deployments so preview URLs are not publicly accessible
- **Verify:** A preview deployment URL requires Vercel SSO to access.

**13. Review custom domain and HTTPS**
- Go to: **Vercel Project → Settings → Domains**
- Confirm your production domain has a valid TLS certificate (Vercel provides this automatically)
- Confirm HTTP redirects to HTTPS (Vercel does this by default)
- **Verify:** `curl -I http://<your-domain>` returns a 301 redirect to HTTPS.

**14. Enable Vercel Speed Insights / Web Analytics (optional but useful)**
- Useful for detecting anomalous traffic spikes that could indicate a scraping or abuse attempt
- **Verify:** Dashboard shows real-time page views.

---

### Final Verification Procedure

After completing all dashboard items:

```powershell
# From admin/ directory:
npm run typecheck          # Must exit 0
npm test                   # Must show 130/130 PASS
npm run audit              # Must show 0 high/critical vulnerabilities
npm run build              # Must exit 0, no .map files in dist/
powershell -ExecutionPolicy Bypass -File scripts/security-smoke.ps1 -EnvFile .env.local
# Must show 16 PASS | 0 FAIL (after DB-01 migration is applied)
```

> [!NOTE]
> Tests that cannot be verified by this agent (require your manual action in the browser or Supabase dashboard) are marked **"Needs your action"** in the status matrix above. Everything in the **Fixed** rows was tested by running the actual code, build, unit tests, or smoke test.
