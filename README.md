# Portfolio Admin

The Vite + React + TypeScript admin interface for managing all portfolio content. Connects to Supabase for auth, database, and storage. Deployed on Vercel.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript 7 |
| Build | Vite 8 + Tailwind CSS 4 |
| Routing | React Router 7 (lazy-loaded routes) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Linting | oxlint |
| Deployment | Vercel (SPA rewrites, `noindex` headers) |
| Fonts | Inter Variable + JetBrains Mono Variable (via `@fontsource-variable`) |

---

## Key Features

- **Full CRUD** for all portfolio content: projects, skills, education, certifications, publications, sections, profile, social links, site settings, theme
- **Supabase Auth** with email/password — admin access controlled by `admins` table (RLS)
- **File uploads** to Supabase Storage with validation (type, size, safe filenames)
- **Project editor** with cover image + document attachments, locked until row is saved
- **Drag-and-drop reordering** via position-swapping on all list tables
- **System diagnostics** dashboard (auth, admin status, DB read/write, storage health)
- **Real-time content version** bumping via DB trigger + Realtime
- **Theme editor** with live CSS custom property preview (RGB stored in DB)
- **Responsive layout** with collapsible sidebar + mobile drawer
- **Toast notifications** (error toasts persist; success/info auto-dismiss)
- **Error boundaries** per route

---

## Database Schema Overview

### Singleton Tables (`id = 1`)

| Table | Purpose |
|-------|---------|
| `site_settings` | Brand, hero, footer, SEO, theme (all JSONB) |
| `profile` | Name, headline, summary, contact, avatar, resume |
| `content_version` | Version counter + timestamp for Realtime invalidation |

### List Tables (all have `id uuid`, `position int4`, `visible bool`, `updated_at`)

| Table | Description |
|-------|-------------|
| `social_links` | Nav/footer links with Lucide icon names |
| `overview_rows` | Key-value pairs for About grid |
| `competencies` | Single-column bullet list |
| `skill_domains` | Title + `tools text[]` + status |
| `projects` | Full project records with `bullets[]`, `tech[]`, `cover_url`, `files jsonb[]` |
| `education` | Degree, institution, score, note |
| `certifications` | Title, issuer, dates, credential URL, featured |
| `publications` | Title, venue, published_on, summary, reference, URL |
| `sections` | Flexible content blocks (slug, type, content JSONB) |
| `messages` | Contact form submissions (admin read-only) |

### Admin Access

| Table | Purpose |
|-------|---------|
| `admins` | Maps `auth.users.id` → admin; RLS gates all write access |

### Special

- `public_profile` view: merges `site_settings` + `profile` for public API
- `is_admin()` SQL function: used in RLS policies

---

## Storage Buckets

| Bucket | Max Size | Allowed Types | Path Convention |
|--------|----------|---------------|-----------------|
| `portfolio` | 10 MB | `image/*`, `application/pdf` | `avatar/`, `resume/`, `sections/<slug>/`, `projects/<id>/cover/` |
| `project-documents` | 20 MB | `application/pdf`, `image/*`, Office formats | `<project-id>/<safeName>` |

All files are public (no auth required to read). Filenames are sanitized via `safeName()` (lowercase, hyphens, timestamp prefix).

---

## Project Structure

```
admin/
├── docs/
│   └── CONTENT_CONTRACT.md       # Canonical DB schema, JSON shapes, storage conventions
├── public/
│   ├── favicon.svg
│   └── icons.svg                 # Lucide symbol sprite
├── src/
│   ├── components/
│   │   ├── ui/                   # Shared primitives
│   │   │   ├── Field.tsx         # Labeled input with hint/error
│   │   │   ├── TextArea.tsx
│   │   │   ├── Toggle.tsx        # Boolean switch
│   │   │   ├── TagInput.tsx      # Comma/Enter-separated chips
│   │   │   ├── ListEditor.tsx    # Reorderable bullet list
│   │   │   ├── ImageUpload.tsx   # Drag-drop + preview + delete
│   │   │   ├── FileUpload.tsx    # Document upload
│   │   │   ├── FileListItem.tsx  # Attached file row with remove
│   │   │   ├── PageHeader.tsx    # Eyebrow + title + description
│   │   │   ├── ConfirmButton.tsx # Two-step destructive action
│   │   │   ├── Toast.tsx         # Global toasts (error/info/success)
│   │   │   └── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx     # Per-route error catcher
│   │   ├── Layout.tsx            # Sidebar + drawer + unread badge
│   │   └── RequireAdmin.tsx      # Auth guard (redirects to /login)
│   ├── lib/
│   │   ├── auth.tsx              # AuthContext, useAuth, signIn/Out
│   │   ├── color.ts              # RGB ↔ hex, WCAG contrast
│   │   ├── storage.ts            # validateFile, uploadFile, removeFile, extractStoragePath
│   │   ├── projectStorage.ts     # deleteProjectCover, deleteProjectDocument, deleteProjectStorage
│   │   ├── supabase.ts           # Anon-key client (RLS handles auth)
│   │   ├── useCrud.ts            # Generic CRUD hook for list tables
│   │   ├── validation.ts         # emptyToNull, isValidUrl
│   │   └── date.ts               # Formatting helpers
│   ├── pages/                    # One file per route (all lazy-loaded)
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx         # Stats cards + system diagnostics
│   │   ├── Settings.tsx          # site_settings (hero, footer, SEO)
│   │   ├── Profile.tsx
│   │   ├── About.tsx             # overview_rows + competencies
│   │   ├── Sections.tsx          # Flexible content sections
│   │   ├── Projects.tsx          # List + reorder
│   │   ├── ProjectEditor.tsx     # Full editor with cover + documents
│   │   ├── Skills.tsx            # skill_domains
│   │   ├── Education.tsx
│   │   ├── Certifications.tsx
│   │   ├── Publications.tsx
│   │   ├── Theme.tsx             # Live theme editor (RGB in DB)
│   │   ├── Messages.tsx          # Inbox with mark-read
│   │   ├── NotFound.tsx
│   │   └── Placeholder.tsx
│   ├── types/
│   │   ├── database.ts           # Generated Supabase types (Postgrest 14.18)
│   │   └── rows.ts               # App-level interfaces mirroring DB
│   ├── nav.ts                    # Sidebar NAV array (Lucide icons)
│   ├── App.tsx                   # Route tree (Suspense + lazy)
│   ├── main.tsx                  # AuthProvider + router mount
│   └── index.css                 # Tailwind + CSS custom properties
├── index.html
├── vercel.json                   # SPA rewrites + noindex
├── vite.config.ts
├── tsconfig.json / .app / .node
└── package.json
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- A Supabase project with the portfolio schema applied (see `docs/CONTENT_CONTRACT.md`)

### Install

```powershell
cd admin
npm install
```

### Environment Variables

Create `.env.local` in `admin/`:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

> **Never use the `service_role` key here.** The anon key is safe because Row Level Security policies on each table restrict writes to admin users only.

### Run Dev Server

```powershell
npm run dev
```

Runs at `http://localhost:5173` by default.

---

## Creating the First Admin User

1. Create a user in Supabase Auth (Dashboard → Authentication → Users → Invite user), or let them sign up if sign-ups are enabled.
2. Copy their UUID from the Auth → Users list.
3. Run this SQL in the Supabase SQL editor:

```sql
insert into public.admins (user_id)
values ('<auth-user-uuid>');
```

> Only users listed in the `admins` table can access the admin site. Any authenticated user not in that table sees an "Access denied" screen.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/` |
| `npm run lint` | Run oxlint |
| `npm run preview` | Preview production build locally |

---

## Deployment to Vercel

### One-Time Project Setup

1. Push the monorepo to GitHub (or GitLab / Bitbucket).
2. In Vercel, click **Add New Project** → import the repo.
3. Set **Root Directory** to `admin`.
4. Set **Framework Preset** to `Vite`.
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**.

The `admin/vercel.json` already configures SPA rewrites and `noindex` headers.

### Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add:

```
https://<your-vercel-domain>.vercel.app/**
```

This allows magic-link / OAuth flows to redirect back to the admin site.

---

## Key Conventions

| Rule | Detail |
|------|--------|
| **No `service_role` key** | Use anon key; RLS handles auth |
| **`emptyToNull()`** | Wrap all nullable text/url/date fields before saving |
| **Error toasts** | Stay until dismissed; success/info auto-dismiss after 4 s |
| **No `any` type** | Use `unknown` with type guards or proper interfaces |
| **`import type`** | Use for all type-only imports |
| **PowerShell commands** | Use `;` to chain commands, never `&&` |
| **RGB in DB** | Colors stored as `"R G B"` strings (e.g. `"79 126 255"`), used as `rgb(var(--color-accent))` |
| **Position spacing** | New rows get `max(position) + 10`; reorder swaps positions |

---

## System Diagnostics (Dashboard)

The Dashboard includes a **System Check** that verifies:

1. **Signed-in email** — current auth session
2. **Is admin** — user exists in `admins` table
3. **Read access** — can query `projects` count
4. **Write access** — can update `site_settings` (no-op) and receive row back
5. **Storage access** — can upload + delete a 1×1 PNG to `portfolio` bucket

Run it anytime from the Dashboard to troubleshoot permission issues.

---

## Useful SQL Snippets

```sql
-- Verify a save landed
select id, logo_text, now() - updated_at as age
from public.site_settings;

-- Check admins
select a.user_id, u.email
from public.admins a
join auth.users u on u.id = a.user_id;

-- Unread message count
select count(*) from public.messages where is_read = false;

-- Content version (bumped by DB trigger on any list table change)
select version, updated_at from public.content_version where id = 1;

-- List all projects with visibility
select id, title, visible, featured, position, updated_at
from public.projects
order by position;
```

---

## Content Contract

The canonical reference for every table, column, JSON shape, storage bucket, and naming convention is in **[`docs/CONTENT_CONTRACT.md`](docs/CONTENT_CONTRACT.md)**. Both the Admin site and the public portfolio frontend follow this contract. **Never invent columns or tables not listed there.**

---

## License

Private — internal tooling for portfolio management.