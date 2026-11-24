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
