# SECURITY PROGRESS

## Phase 2: XSS and input validation

### Files Created / Modified
- `src/lib/safeUrl.ts` - created - Implemented safeUrl() allowing only http:, https:, mailto:, tel: schemes, rejecting control characters and XSS protocols, plus safeImageUrl() helper.
- `src/lib/schemas.ts` - created - Implemented comprehensive Zod schemas for all written tables matching limits in 04_hardening.sql, accepting seeded data (mailto/tel social links, empty dates, empty optional fields).
- `src/lib/db.ts` - created - Centralized database write helper with table schema validation.
- `src/lib/useCrud.ts` - modified - Integrated validateTableData() into insert and update paths before sending mutations to Supabase.
- `src/lib/validation.ts` - modified - Refactored isValidUrl() to leverage safeUrl() and support mailto/tel options.
- `src/components/ui/FileUpload.tsx` - modified - Applied safeUrl() to file link previews with fallback placeholder when unsafe.
- `src/components/ui/ImageUpload.tsx` - modified - Applied safeImageUrl() to image preview src.
- `src/pages/Certifications.tsx` - modified - Applied safeUrl() to credential URL links in editor and list views.
- `src/pages/Profile.tsx` - modified - Integrated profileSchema validation on save, safeUrl() for social and resume links, allowing mailto/tel social links.
- `src/pages/Projects.tsx` - modified - Applied safeImageUrl() to cover image and safeUrl() to live site links.
- `src/pages/ProjectEditor.tsx` - modified - Integrated projectSchema validation for new and updated projects.
- `src/pages/Publications.tsx` - modified - Applied safeUrl() to publication external links.
- `src/pages/Sections.tsx` - modified - Applied safeImageUrl() to gallery image previews and added safeUrl() check for cards URLs.
- `src/pages/Messages.tsx` - modified - Applied safeUrl() to reply mailto link.
- `src/pages/Settings.tsx` - modified - Integrated siteSettingsSchema validation for brand, hero, footer, and SEO saves.
- `src/pages/Theme.tsx` - modified - Integrated siteSettingsSchema validation for theme palette updates.
- `src/pages/About.tsx` - modified - Integrated sectionSchema validation for about section content updates.

### What You Should Test
1. **Social Links:** In `/profile`, add/edit a social link with `mailto:admin@example.com` and `tel:+1234567890`. Verify both save successfully and render properly.
2. **Certifications with Empty Dates:** In `/certifications`, save a certification with no issue date or expiration date. Verify it saves and displays without error.
3. **URL Scheme Restrictions:** Try entering `javascript:alert(1)` or `data:text/html,test` into any URL field (e.g. project live URL or publication URL); verify it is rejected with a validation error.
4. **Link Attributes:** Inspect external link elements in DevTools; verify all external `<a>` tags maintain `rel="noopener noreferrer"`.
5. **JSON Size Limits:** Verify that standard section, settings, and project updates save cleanly.

### Open Issues
- None from Phase 2.

---

## Phase 3: File upload security

### Files Created / Modified
- `src/lib/storage.ts` - modified - Added detectFileType() to verify file magic bytes (%PDF-, PNG, JPEG, WebP, AVIF, Office OpenXML DOCX/XLSX/PPTX as ZIP PK); enforced strict extension-to-detected-content matching; rejected SVGs, HTML, JS, and generic archives; enforced file size checks before reading memory; generated names as <uuid>-<safe-slug>.<ext>; added sanitizeStoragePath() to strip path traversal/dots-only segments; and set contentType strictly from detected MIME type.
- `src/components/ui/ImageUpload.tsx` - modified - Sanitized storage paths, and added automatic purging of old storage objects upon image replacement or removal to prevent orphaned files.
- `src/components/ui/FileUpload.tsx` - modified - Added sanitizeStoragePath() on folder segments before file upload.
- `src/pages/Profile.tsx` - modified - Added automatic deletion of previous resume file from storage upon resume removal or replacement.
- `src/pages/Sections.tsx` - modified - Sanitized section slug in gallery upload path to prevent path traversal or malformed directory names.

### What You Should Test
1. **Valid Image Uploads:** Upload valid PNG, JPEG, WebP, or AVIF image in `/profile` (avatar) or `/projects` (cover). Verify upload succeeds and preview renders.
2. **Valid Document Uploads:** Upload a valid PDF or DOCX file in `/projects/:id` (Documents) or resume PDF in `/profile`. Verify upload succeeds.
3. **Spoofed Extension / Content Rejection:** Rename an `.exe`, `.svg`, or `.txt` file to `.png` or `.pdf` and attempt upload. Verify it is rejected with an error stating unsupported or mismatched content.
4. **Orphan Purging:** Replace an existing avatar or project cover. Check Supabase Storage to verify the previous file object was removed.
5. **Filename Entropy:** Inspect the uploaded file URL; confirm it follows the `<uuid>-<safe-slug>.<ext>` convention without containing raw unsanitized user filenames.

### Open Issues
- None from Phase 3.

---

## Phase 4: Authentication, sessions and MFA

### Files Created / Modified
- `src/lib/auth.tsx` - modified - Implemented 30-minute idle inactivity timeout with 1-minute warning toast, 2-hour hidden-tab timeout, and global sign-out (signOutAll).
- `src/pages/Login.tsx` - modified - Standardized generic login error message ("Email or password is incorrect"), and implemented client-side exponential backoff lockout after 3 consecutive failures.
- `src/components/MfaChallenge.tsx` - created - 6-digit TOTP challenge screen for sessions requiring aal2 authentication.
- `src/components/RequireMfa.tsx` - created - Authenticator assurance level route guard allowing optional enrolment while enforcing aal2 when a factor is enrolled.
- `src/pages/Security.tsx` - created - Added /security page to enrol TOTP authenticators, display QR code and secret, verify challenge, list enrolled factors, securely unenroll factors via fresh verification, warning alert regarding lack of recovery codes, and global sign-out button.
- `src/nav.ts` - modified - Added Security navigation item with Shield icon.
- `src/App.tsx` - modified - Wired RequireMfa route guard and added /security route.
- `src/components/Layout.tsx` - modified - Added "Sign out all devices" action in the sidebar.
- `src/main.tsx` - modified - Placed ToastProvider outside AuthProvider so auth-level session notifications function properly.

### What You Should Test
1. **Login Generic Error & Backoff:** Enter incorrect credentials on `/login`. Verify error message is always "Email or password is incorrect". After 3 failed attempts, verify the submit button is locked with an active countdown timer.
2. **MFA Enrolment:** Navigate to `/security` and click "Enrol Authenticator". Scan the QR code with Google Authenticator or 1Password, enter the 6-digit code, and verify it activates.
3. **MFA Challenge on Login:** Once enrolled, sign out and log back in. Verify you are greeted by the MFA challenge screen before gaining access to the admin dashboard.
4. **MFA Unenrolment:** On `/security`, click "Remove" on an active factor. Enter the current 6-digit code and verify factor is removed.
5. **Optional Enrolment:** Ensure accounts without MFA enrolled are NOT blocked and can access all pages normally.
6. **Global Sign-out:** Click "Sign out of all devices". Verify all active refresh tokens are revoked across sessions.

### Open Issues
- None from Phase 4.

---

## Phase 5: Errors, timeouts, retries and write safety

### Files Created / Modified
- `src/lib/errors.ts` - created - Centralized error mapping function `friendlyErrorMessage()` converting Supabase/PostgREST codes (23505 duplicate key, 23514 check constraints), HTTP status codes (401 session expired, 403 forbidden, 404 not found, 409 conflict, 413 payload too large, 429 rate limit, 5xx server error), network timeouts/aborts, and optimistic concurrency messages into safe user-facing alerts without exposing database internals.
- `src/components/ErrorBoundary.tsx` - modified - Redesigned to show friendly, non-leaking fallback UI without raw error messages or component stack traces, featuring "Try again" and "Go to Dashboard" recovery actions.
- `src/main.tsx` - modified - Mounted top-level `<ErrorBoundary>` wrapping the entire React application tree.
- `src/lib/db.ts` - modified - Added `withReadRetry()` helper enforcing a 15-second AbortController timeout and up to 3 exponential backoff retries with random jitter on network errors and HTTP 5xx/429 responses. Updated `updateRow()` to support optimistic concurrency matching `loadedUpdatedAt`.
- `src/lib/useCrud.ts` - modified - Wrapped `reload()` queries in `withReadRetry()`; added optimistic concurrency `.eq('updated_at', loadedUpdatedAt)` on updates throwing "This item was changed elsewhere. Reload and try again." on mismatch; ensured returned row with fresh `updated_at` updates internal state; and converted raw errors to `friendlyErrorMessage()`.
- `src/pages/ProjectEditor.tsx` - modified - Added optimistic concurrency matching `project.updated_at` on update; refreshed local project state and `updated_at` immediately upon save, cover change, document upload, and document removal so consecutive saves never produce false concurrency errors; wrapped reads with `withReadRetry()`; and mapped all errors with `friendlyErrorMessage()`.
- `src/pages/Settings.tsx` - modified - Tracked `loadedUpdatedAt` across site settings; enforced optimistic concurrency on Brand, Hero, Footer, and SEO saves; refreshed `loadedUpdatedAt` on every save; wrapped reads with `withReadRetry()`; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Profile.tsx` - modified - Tracked `loadedUpdatedAt` on profile (id = 1); enforced optimistic concurrency matching `loadedUpdatedAt` and refreshed it from the saved row on success; wrapped reads with `withReadRetry()`; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Theme.tsx` - modified - Tracked `loadedUpdatedAt` for theme settings; enforced optimistic concurrency on theme saves and refreshed `loadedUpdatedAt` from returned row; wrapped reads with `withReadRetry()`; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/About.tsx` - modified - Enforced optimistic concurrency on section content updates matching `fresh.updated_at` and updated `sectionRow` with saved row; wrapped reads with `withReadRetry()`; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Sections.tsx` - modified - Enforced optimistic concurrency matching `editingMeta.updated_at` and `editingContent.updated_at`; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Certifications.tsx` - modified - Preserved `editingItem.updated_at` when invoking `save()` for optimistic concurrency; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Education.tsx` - modified - Preserved `editingItem.updated_at` on save; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Skills.tsx` - modified - Preserved `editingItem.updated_at` on save; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Publications.tsx` - modified - Preserved `editingItem.updated_at` on save; and mapped errors with `friendlyErrorMessage()`.
- `src/pages/Projects.tsx` - modified - Mapped toggle, move, and delete errors with `friendlyErrorMessage()`.
- `src/pages/Messages.tsx` - modified - Wrapped reads in `withReadRetry()` and mapped errors with `friendlyErrorMessage()`.
- `vite.config.ts` - modified - Configured `build: { sourcemap: false }` and Rolldown compression options (`rolldownOptions.output.minify.compress.dropConsole = true` and `dropDebugger = true`) for Vite 8, ensuring zero source maps, debugger statements, or application console calls in production output.

### What You Should Test
1. **Consecutive Saves:** In `/projects/:id`, `/profile`, `/settings`, or `/theme`, edit and save an item once. Immediately edit and save the item again without refreshing the page. Verify the second save succeeds without throwing a "changed elsewhere" error.
2. **Optimistic Concurrency Detection:** Open the same project or profile in two separate browser tabs. In Tab A, change a field and save. In Tab B, change a field and save without reloading. Verify Tab B displays "This item was changed elsewhere. Reload and try again."
3. **Friendly Error Messages:** Trigger a duplicate slug or validation constraint; confirm the displayed toast is clean, human-readable, and does not leak database column names, constraint IDs, or SQL internals.
4. **Error Boundary Fallback:** Trigger an unhandled error inside a component view. Verify the generic fallback displays "Something went wrong" with "Try again" and "Go to Dashboard" buttons, without exposing stack traces or raw message text.
5. **Production Build Inspection:** Verify `npm run build` generates 0 sourcemap files (`.map`) and eliminates `debugger` and application console statements in `dist/assets/`.

### Open Issues
- None from Phase 5.
