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
