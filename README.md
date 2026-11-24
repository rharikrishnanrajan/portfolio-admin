# Admin Site — Developer README

This is the Vite + React + TypeScript admin site for the portfolio backend.
It connects to Supabase and lets you manage all portfolio content.

---

## Local setup

### Prerequisites

- Node.js 20 or later
- A Supabase project with the portfolio schema applied

### Install

```powershell
cd d:\portfolioadmin\admin
npm install
```

### Environment variables

Create a file called `.env.local` in the `admin/` directory:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

> **Never use the `service_role` key here.** The anon key is safe because
> Row Level Security policies on each table restrict writes to admin users only.

### Run dev server

```powershell
cd d:\portfolioadmin\admin
npm run dev
```

The site runs at `http://localhost:5173` by default.

---

## Creating the first admin user

1. Create a user in Supabase Auth (Dashboard → Authentication → Users → Invite user),
   or let them sign up if sign-ups are enabled.

2. Copy their UUID from the Auth → Users list.

3. Run this SQL in the Supabase SQL editor:

```sql
insert into public.admins (id)
values ('<auth-user-uuid>');
```

> Only users listed in the `admins` table can access the admin site.
> Any authenticated user not in that table sees an "Access denied" screen.

---

## Build

```powershell
cd d:\portfolioadmin\admin
npm run build
```

Output is in `admin/dist/`. TypeScript is checked first via `tsc -b`; the build
aborts on any type error.

---

## Deployment to Vercel

### One-time project setup

1. Push the monorepo to GitHub (or GitLab / Bitbucket).
2. In Vercel, click **Add New Project** → import the repo.
3. Set **Root Directory** to `admin`.
4. Set **Framework Preset** to `Vite`.
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**.

The `admin/vercel.json` already configures SPA rewrites and `noindex` headers.

### Supabase Auth redirect URLs

In the Supabase Dashboard → Authentication → URL Configuration, add:

```
https://<your-vercel-domain>.vercel.app/**
```

This allows the magic-link / OAuth flows to redirect back to the admin site.

---

## Project structure

```
admin/
├── docs/
│   └── CONTENT_CONTRACT.md   # DB schema, JSON shapes, storage conventions
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ui/               # Shared UI primitives (Field, Toggle, Toast, …)
│   │   ├── ErrorBoundary.tsx
│   │   ├── Layout.tsx        # Sidebar + responsive drawer + ErrorBoundary
│   │   └── RequireAdmin.tsx  # Auth guard
│   ├── lib/
│   │   ├── auth.tsx          # AuthContext, useAuth, signIn, signOut
│   │   ├── color.ts          # RGB ↔ hex helpers, WCAG contrast
│   │   ├── storage.ts        # extractStoragePath, upload helpers
│   │   ├── supabase.ts       # Supabase client (anon key only)
│   │   ├── useCrud.ts        # Generic CRUD hook for list tables
│   │   └── validation.ts     # emptyToNull(), isValidUrl()
│   ├── pages/                # One file per route
│   ├── types/
│   │   └── rows.ts           # TypeScript interfaces mirroring DB schema
│   ├── App.tsx               # Route tree (all pages lazy-loaded)
│   ├── main.tsx
│   └── nav.ts                # Sidebar NAV array
├── index.html
├── vercel.json
├── vite.config.ts
└── package.json
```

---

## Key conventions

| Rule | Detail |
|---|---|
| No `service_role` key | Use anon key; RLS handles auth |
| `emptyToNull()` | Wrap all nullable text/url/date fields before saving |
| Error toasts | Stay until dismissed; success/info auto-dismiss after 4 s |
| No `any` type | Use `unknown` with type guards or proper interfaces |
| `import type` | Use for all type-only imports |
| PowerShell commands | Use `;` to chain commands, never `&&` |

---

## Useful SQL snippets

```sql
-- Verify a save landed
select id, logo_text, now() - updated_at as age
from public.site_settings;

-- Check admins
select a.id, u.email
from public.admins a
join auth.users u on u.id = a.id;

-- Unread message count
select count(*) from public.messages where is_read = false;

-- Content version
select version, updated_at from public.content_version where id = 1;
```
