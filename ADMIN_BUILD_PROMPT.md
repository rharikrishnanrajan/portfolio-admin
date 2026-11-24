# ADMIN SITE BUILD PROMPT

You are a senior React + TypeScript engineer. Extend the existing admin app in this folder so the site owner can edit every part of a dynamic portfolio website stored in Supabase.

## HOW TO WORK
- Do ONLY the phase I name in my message. Do not start the next phase.
- Before coding, read the files listed under "Existing code" so you match their style.
- After finishing, run `npm run build`, fix every error, then report: files created/changed, and how I can test it manually.
- Do not rewrite or reformat files that are not part of the phase.
- Environment is Windows PowerShell 5.1: never use `&&` in commands you give me; use `;` or separate lines.
- If something is ambiguous or the schema lacks a column you need, STOP and ask. Do not invent columns, tables or env variables.

## STACK (already installed, add nothing unless a phase says so)
Vite, React 19, TypeScript (strict, `verbatimModuleSyntax`: use `import type` for types, no enums, no `any`), Tailwind CSS v4 (CSS-first), react-router-dom, @supabase/supabase-js, lucide-react.

## EXISTING CODE (read first)
- `src/index.css`: theme tokens (CSS variables holding space-separated RGB) and classes `.card`, `.input`, `.btn-primary`, `.eyebrow`.
- Tailwind color utilities available: `bg-bg`, `bg-surface`, `border-line`, `text-ink`, `text-muted`, `text-accent`, `bg-accent/15`, `font-mono`. Never hard-code hex colors in components.
- `src/lib/supabase.ts`: the ONLY Supabase client. Import `supabase` from it.
- `src/lib/auth.tsx`: `useAuth()` gives `session`, `isAdmin`, `signOut`. All pages are already behind `RequireAdmin`.
- `src/nav.ts`: sidebar items (`NAV`). `src/App.tsx` maps each item to a route; pages are currently `Placeholder`.
- `src/components/Layout.tsx`, `src/pages/Dashboard.tsx` show the visual style: sharp 1px-bordered cards, mono uppercase eyebrow labels, big bold headings, gradient primary button.
- Optional: `src/types/database.ts` (generated). Do not depend on it. Define your own row types in `src/types/rows.ts`.

## SECURITY RULES (non-negotiable)
- Use only the existing anon/publishable-key client. NEVER use or ask for a service_role/secret key.
- Security is enforced by Postgres RLS: the logged-in admin may read/write everything, the public may only read visible rows. Do not add client-side "security"; just surface Supabase errors to me.
- Never log secrets. Never commit `.env*`.
- Do not change the database schema. If you think a change is needed, write the proposed SQL in your report and wait.

## DATABASE (Supabase Postgres, schema `public`)
Singletons (exactly one row, `id = 1`; use `update ... eq('id',1)`):
- `site_settings`: logo_text text, brand_name text, nav_cta_label text, hero jsonb, footer jsonb, theme jsonb, seo jsonb
  - hero = { ghost_word, roles: string[], tagline, cta_primary:{label,target}, cta_secondary:{label,target}, chips_left: string[], chips_right: string[], stats: {label,value}[] }
  - footer = { blurb, index_title, direct_title, status_label, copyright }
  - seo = { title, description }
  - theme = { default_mode: 'dark'|'light', fonts:{heading,mono}, dark:{bg,surface,border,text,muted,accent,accent2}, light:{...same keys} }  (colors are "R G B" strings, e.g. "79 126 255")
- `profile`: full_name, headline, summary, email, phone, location, avatar_url, resume_url, show_email bool, show_phone bool

List tables (all have `id uuid` default-generated, `position int`, `visible bool`, `updated_at`; admin sees hidden rows too):
- `social_links`: label, url, icon
- `overview_rows`: label, value
- `competencies`: text
- `skill_domains`: title, tools text[], status text
- `projects`: kicker, title, summary, outcome, tagline, bullets text[], tech text[], github_url, live_url, cover_url, files jsonb ([{name,url,path,type}]), featured bool
- `education`: degree, institution, score_label, score, note
- `certifications`: title, issuer, start_date date, end_date date, credential_url, featured bool
- `publications`: title, venue, published_on date, summary, reference, url
- `sections`: slug (unique), type, nav_label, eyebrow, title, subtitle, content jsonb, show_in_nav bool
  - built-in types: about, skills, projects, publications, education, certifications, contact. Custom types: rich_text, cards, gallery.
- `messages`: name, email, subject, body, is_read bool, created_at (admin may read/update/delete)

Storage buckets (both public-read, admin-only write):
- `portfolio` (10 MB; png, jpeg, webp, avif, pdf): profile photo, resume, project covers, certificate files, section images.
- `project-documents` (20 MB; pdf, images, docx, pptx, xlsx): project documents only, path `<project-id>/<filename>`.

## CONVENTIONS
- One page = one file in `src/pages/`, shared pieces in `src/components/ui/` and `src/lib/`.
- Every form: loading state, disabled save while busy, inline error text, success toast, required-field validation, URLs must start with http:// or https:// when filled.
- New list rows get `position = (max position) + 10`. Reordering = swap `position` between neighbours, with up/down buttons (no drag-and-drop library).
- Destructive actions (delete) require a confirm step.
- Keep components small and typed. No inline hex colors. Accessible labels on every input.
- Empty/loading/error states on every list.

---

# PHASE 0: shared building blocks
Create (and use in later phases):
1. `src/types/rows.ts`: TypeScript interfaces for every table above.
2. `src/lib/storage.ts`:
   - `uploadFile(bucket, path, file): Promise<{ url: string; path: string }>` using `upsert: false`; returns the public URL.
   - `removeFile(bucket, path)`.
   - Client-side validation by bucket (type + size limits above) with friendly error messages.
   - `safeName(file.name)`: lowercase, spaces to hyphens, strip unsafe characters, prefix with a timestamp so replaced images are not cached.
3. `src/lib/useCrud.ts`: generic hook `useCrud<T>(table, { orderBy = 'position' })` returning `{ rows, loading, error, reload, save(row), remove(id), move(id, 'up'|'down'), toggle(id, field) }`. `save` inserts when `id` is missing, otherwise updates, and returns the saved row.
4. `src/components/ui/`: `PageHeader`, `Field` (label + input), `TextArea`, `Toggle`, `TagInput` (string[] as removable chips; Enter to add), `ListEditor` (string[] as multi-line rows with add/remove/up/down, used for bullets), `ImageUpload` (preview, upload, replace, remove; takes bucket + folder), `FileUpload` (for documents), `ConfirmButton`, `EmptyState`, and a lightweight toast system (`ToastProvider`, `useToast`) wired into `main.tsx`.
Acceptance: `npm run build` passes; no page behaviour changes yet.

# PHASE 1: Site & Hero, Profile
1. `/settings` page (`src/pages/Settings.tsx`) editing `site_settings` (id=1) in sections: Brand (logo_text, brand_name, nav_cta_label), Hero (all hero fields; `stats` as a repeater of label/value; chips as TagInput), Footer, SEO. Merge into existing JSON so unknown keys are preserved. One Save button per section.
2. `/profile` page (`src/pages/Profile.tsx`): profile fields, show_email / show_phone toggles, avatar upload (`portfolio` bucket, folder `profile/`) and resume PDF upload (`portfolio`, folder `resume/`). Show current files with remove buttons. Below it, CRUD for `social_links` (icon select: github, linkedin, mail, phone, globe, twitter, youtube).
Acceptance: edit a value, refresh the page, value persists; upload an avatar and the preview shows from the public URL; a non-image file is rejected with a clear message.

# PHASE 2: Projects
`/projects` list (reorder, visible toggle, featured toggle, edit, delete with confirm) and an editor at `/projects/:id` (and `/projects/new`).
Editor fields: kicker, title (required), summary, outcome, tagline, bullets (ListEditor), tech (TagInput), github_url, live_url, cover image (`portfolio`, folder `projects/<id>/`), documents (`project-documents`, path `<id>/<safeName>`, stored in `files` as `{name,url,path,type}` with remove buttons).
For a new project: insert the row first (to get its id), then enable uploads. Deleting a project also deletes its storage files from both buckets.
Add the route `projects/:id` and `projects/new` in `App.tsx`.
Acceptance: create a project with a cover and a PDF, reorder it, hide it, delete it, and storage is cleaned.

# PHASE 3: Skills, Education, Certifications, Publications, About
Each is a CRUD page using the shared hook and UI (list with reorder, visible toggle, inline or drawer editor):
- `/skills`: `skill_domains` (title, tools TagInput, status).
- `/education`, `/certifications` (month-level date inputs, featured toggle, optional credential PDF upload to `portfolio`/`certifications/` that fills `credential_url`), `/publications`.
- Add a new sidebar entry and route `/about` editing `overview_rows`, `competencies`, and the `about` section's `content` (`overview_title`, `competencies_title`, `highlights[{label,value}]`).

# PHASE 4: Sections
`/sections`: list all sections ordered by `position` with visible and show_in_nav toggles, up/down reorder, and an editor for nav_label, eyebrow, title, subtitle.
- Built-in sections: can be hidden, reordered and renamed, never deleted, `slug` and `type` locked.
- Create custom section: title -> auto slug (`[a-z0-9-]`, must be unique), type `rich_text` { body }, `cards` { items:[{title,text,url?}] } or `gallery` { images:[{url,caption}] } (uploads to `portfolio`/`sections/<slug>/`). Custom sections can be deleted (also delete their images).

# PHASE 5: Theme editor
`/theme` page editing `site_settings.theme`:
- default_mode select, heading/mono font selects (from a fixed list of names), and 7 colors each for dark and light using `<input type="color">` plus a hex text box. Convert hex <-> "R G B" strings with tested helper functions in `src/lib/color.ts`.
- Preset buttons (Blue default `79 126 255 / 199 210 254`, Emerald, Violet, Amber, Rose) that only change accent/accent2.
- Live preview panel that applies the chosen tokens through scoped CSS variables on a container (sample navbar pill, card, heading, chip, gradient button).
- Warn when text vs bg contrast is below 4.5:1 (WCAG helper in `src/lib/color.ts`).
- Reset to defaults and Save. The admin UI itself keeps its default dark theme.

# PHASE 6: Messages and dashboard polish
- `/messages`: newest first, unread shown bold, detail pane, mark read/unread, delete (confirm), "Reply" as a `mailto:` link, unread count badge on the sidebar item.
- Dashboard: make the stat cards link to their pages; add a "Content last updated" line from `content_version`.

# FINAL REPORT FORMAT
After each phase: (1) list of files, (2) what to click to test, (3) anything you were unsure about, (4) confirmation that `npm run build` passes.
