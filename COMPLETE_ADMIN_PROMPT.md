# COMPLETE THE ADMIN WEBSITE (single end-to-end task)

You are a senior React + TypeScript engineer finishing an admin site for a dynamic portfolio stored in Supabase. Work through STAGES A to H in order, in one session.

## RULES
- First read `ADMIN_BUILD_PROMPT.md` (project root). It defines the stack, existing code, security rules, database schema, storage buckets and conventions. Everything there still applies. Where this file says something different, this file wins.
- Then read the code already in `src/lib`, `src/types`, `src/components`, `src/pages`, `src/App.tsx`, `src/nav.ts`. Match their style. Reuse the shared components and hooks; never duplicate them.
- After EACH stage: run `npm run build`, fix every error, then run `git add -A` and `git commit -m "<stage name>"` (separate commands, no `&&`; Windows PowerShell 5.1). Then continue to the next stage without waiting for me.
- Never use or ask for a service_role/secret key. Never change the database schema. If a stage truly needs a schema change or a secret, STOP, explain exactly what, and wait.
- No new dependencies unless a stage says so. No `any`. Use `import type` for types. No hard-coded hex colors in components (use the theme tokens).
- Do not ask me questions mid-way unless blocked. Make sensible decisions and list them in the final report.

## CURRENT STATE (facts)
- Done and building: login, admin guard, layout, dashboard, Settings, Profile (+social links), Projects (+editor), Skills, Education, Certifications, Publications, About. Placeholders remain for /sections, /theme, /messages.
- KNOWN OPEN BUG: in the browser, clicking Save on admin pages does not appear to change the database. But in the browser console, `supabase.from('certifications').update(...).eq(...).select(...)` with the app's own client DOES work (auth, RLS and DB are fine). So the fault is in the app's save path or in how results/errors are shown. Stage A must make this impossible to miss.
- Leftover debug code exists, marked `// TEMP-DEBUG` (including `Object.assign(window, { __supabase: supabase })` in `src/main.tsx` and logs in `Certifications.tsx` and `useCrud.ts`).

---

## STAGE A: reliable saving + diagnostics
1. Audit EVERY page that writes data (Settings, Profile, About, ProjectEditor, Projects, Skills, Education, Certifications, Publications and the shared `useCrud.ts`). For each save path verify:
   - the Save button really triggers the handler (`<form onSubmit>` with `type="submit"` inside the form, `preventDefault`, no `disabled`/busy flag that can stay true);
   - the handler is `await`ed fully and any thrown error is shown, never swallowed;
   - success toast appears ONLY after the database returned the row (`.select()` and non-empty result);
   - failed validation shows a toast AND a visible inline message AND scrolls the message into view (`scrollIntoView({ block: 'center' })`);
   - empty optional fields are saved as `null`, never `""` (create `emptyToNull()` in `src/lib/validation.ts` and use it for every nullable text/url/date column);
   - the payload never contains `id: undefined`, `updated_at`, `created_at`, or fields that are not columns of that table;
   - a stale-closure or re-render problem cannot make the handler save old state.
   Fix everything you find and list each defect (file:line) in the final report.
2. Add a "System check" card on the Dashboard with a "Run check" button. It runs and shows PASS/FAIL plus the exact error text for each:
   (a) signed-in email, (b) is-admin (row in `admins`), (c) read (`projects` count), (d) WRITE: `update site_settings set logo_text = logo_text where id = 1` using `.select('id, updated_at')`, PASS only if one row returns (show the new `updated_at`), (e) STORAGE: upload a 1x1 PNG to `portfolio/_healthcheck/<timestamp>.png`, then delete it, PASS only if both succeed. Never display tokens or keys.
3. Remove every `// TEMP-DEBUG` line in the project (search the whole `src/`), including the `__supabase` window line.
4. Make the toast system visible and reliable (fixed position, high z-index, errors stay until dismissed).

## STAGE B: Sections page (`/sections`)
Implement Phase 4 of `ADMIN_BUILD_PROMPT.md` completely: list ordered by `position` with up/down, visible and show_in_nav toggles, editor for nav_label/eyebrow/title/subtitle, "Built-in" badge and locked slug/type for built-in types (about, skills, projects, publications, education, certifications, contact; these can be hidden/reordered/renamed, never deleted), create custom sections (types `rich_text` {body}, `cards` {items:[{title,text,url?}]}, `gallery` {images:[{url,path,caption}]}), unique slug (`[a-z0-9-]`, reserved words hero/home/top/admin/login/api blocked), gallery uploads to `portfolio` bucket in `sections/<slug>/`, deleting a custom section or a gallery image also deletes its storage files, content saves merge into existing JSON. The hidden "publications" section must be switchable on here. Use the Stage A save rules.

## STAGE C: Theme editor (`/theme`)
Implement Phase 5 of `ADMIN_BUILD_PROMPT.md` completely: edit `site_settings.theme` (default_mode, fonts.heading/mono chosen from a fixed list, and for both `dark` and `light` the 7 tokens bg, surface, border, text, muted, accent, accent2). Colors are stored as "R G B" strings; write tested helpers in `src/lib/color.ts` (hex <-> "R G B", relative luminance, contrast ratio). Preset buttons that change only accent/accent2 (Blue 79 126 255 / 199 210 254, Emerald, Violet, Amber, Rose). Live preview panel using scoped CSS variables (sample nav pill, card, heading, mono chip, gradient button, in the chosen mode, with a dark/light toggle for preview only). Warn when text-vs-bg contrast is below 4.5:1. Reset to defaults and Save. Merge into existing theme JSON. The admin UI itself keeps its default dark theme.

## STAGE D: Messages (`/messages`) + Dashboard polish
- Messages: newest first, unread rows bold, detail pane, mark read/unread, delete with confirmation, "Reply" as a `mailto:` link, filter All/Unread, unread count badge on the sidebar item (refresh after actions and every 60 seconds).
- Dashboard: make stat cards link to their pages, show "Content last updated" from `content_version`, keep the System check card.

## STAGE E: Content export + backup
On the Settings page add an "Export all content" button that downloads one JSON file (`portfolio-backup-YYYY-MM-DD.json`) containing every content table (site_settings, profile, social_links, overview_rows, competencies, skill_domains, projects, education, certifications, publications, sections; messages optional via a checkbox). Add "Import" ONLY as a dry-run preview that validates the file shape and shows row counts; do not write imports to the database.

## STAGE F: Polish and robustness
- Responsive: sidebar collapses to a hamburger drawer below `md`; every page usable at 375px width.
- Route-level code splitting with `React.lazy` + `Suspense` (loading state in the house style) so the main bundle drops well below 500 kB.
- 404 page for unknown routes; error boundary around the routed content showing a friendly message and a reload button.
- Session handling: if the session expires or `signOut` happens, redirect to /login; show a clear message on login for wrong credentials.
- Accessibility pass: every input has a label, buttons have accessible names, focus rings are visible, dialogs trap focus or are native `<dialog>`.
- `index.html`: title "Admin", `<meta name="robots" content="noindex,nofollow">`.
- Add `vercel.json` with an SPA rewrite (`{"rewrites":[{"source":"/(.*)","destination":"/"}]}`) and an `X-Robots-Tag: noindex` header.

## STAGE G: Documentation for the next step
Create `docs/CONTENT_CONTRACT.md` describing, for the public portfolio app that will read this data: every table, its columns and the exact JSON shapes (hero, footer, seo, theme, sections.content per type, projects.files), bucket names and path conventions, the `public_profile` view, the `content_version` realtime row, and which rows are public (`visible = true`). Create `README_ADMIN.md` with: local setup (PowerShell commands), required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), how to create the first admin user (SQL), build, and Vercel deployment steps (root directory, env vars, redirect URLs in Supabase Auth).

## STAGE H: final verification
1. `npm run build` and `npx tsc -b` pass; `npm run lint` passes or lists only pre-existing warnings.
2. `grep`/search confirms no `TEMP-DEBUG`, no `console.log` left except deliberate error logging, no `service_role`, no hard-coded Supabase keys in `src/`.
3. Every sidebar item opens a real page (no Placeholder remains).
4. Write the FINAL REPORT: (a) stage-by-stage list of files created/changed, (b) every defect found in Stage A with file:line, (c) decisions you made, (d) anything you could not verify without a browser (you cannot sign in), (e) a manual test checklist I can follow page by page, with the exact SQL to confirm each save, e.g. `select ... , now() - updated_at as age from public.<table>`.
