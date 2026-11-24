# Content Contract

> This file describes every table, column, JSON shape, storage bucket, and naming convention
> used by both the Admin site and the public portfolio frontend.
> **Never invent columns or tables not listed here.**

---

## Singleton rows

These tables have exactly one row (`id = 1`). Always use `.eq('id', 1).single()`.

### `site_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | `int4` | Always 1 |
| `brand_name` | `text` | Displayed in page title and meta |
| `logo_text` | `text` | Short text shown in nav logo (e.g. "HK") |
| `nav_cta_label` | `text` | Label for the nav call-to-action button |
| `hero` | `jsonb` | See **hero shape** below |
| `footer` | `jsonb` | See **footer shape** below |
| `seo` | `jsonb` | See **seo shape** below |
| `theme` | `jsonb` | See **theme shape** below |
| `updated_at` | `timestamptz` | Auto-updated by DB trigger |

#### `hero` shape

```jsonc
{
  "ghost_word": "ARCHITECT",          // Large background watermark text
  "roles": ["Full Stack Engineer"],   // Array of strings rotated in hero title
  "tagline": "Building resilient…",   // Subtitle line
  "cta_primary":   { "label": "View Projects", "target": "#projects" },
  "cta_secondary": { "label": "Contact Me",    "target": "#contact" },
  "chips_left":  ["React", "TypeScript"],       // Floating badge chips (left side)
  "chips_right": ["Node.js", "Supabase"],       // Floating badge chips (right side)
  "stats": [
    { "label": "Years Experience", "value": "8+" }
  ]
}
```

#### `footer` shape

```jsonc
{
  "blurb": "A short closing statement…",
  "index_title": "Navigation",        // Footer column heading
  "direct_title": "Direct Contact",   // Footer column heading
  "status_label": "Available for opportunities",
  "copyright": "© 2026 Harikrishanan. All rights reserved."
}
```

#### `seo` shape

```jsonc
{
  "title": "Harikrishanan | Senior Full Stack Engineer",
  "description": "Summary for search results and social previews…"
}
```

#### `theme` shape

Colors are stored as **"R G B" space-separated strings** (e.g. `"79 126 255"`), not hex.
Used as CSS custom property values: `color: rgb(var(--color-accent))`.

```jsonc
{
  "default_mode": "dark",             // "dark" | "light"
  "fonts": {
    "heading": "Inter",
    "mono": "JetBrains Mono"
  },
  "dark": {
    "bg":       "10 10 12",
    "surface":  "16 16 20",
    "border":   "38 38 48",
    "text":     "240 240 245",
    "muted":    "120 120 135",
    "accent":   "79 126 255",
    "accent2":  "168 85 247"
  },
  "light": {
    "bg":       "255 255 255",
    "surface":  "248 248 250",
    "border":   "220 220 228",
    "text":     "15 15 20",
    "muted":    "100 100 115",
    "accent":   "59 106 235",
    "accent2":  "147 65 227"
  }
}
```

---

### `profile`

| Column | Type | Nullable |
|---|---|---|
| `id` | `int4` | — |
| `full_name` | `text` | No |
| `headline` | `text` | Yes |
| `summary` | `text` | Yes |
| `email` | `text` | Yes |
| `phone` | `text` | Yes |
| `location` | `text` | Yes |
| `avatar_url` | `text` | Yes — public URL from `portfolio` bucket |
| `resume_url` | `text` | Yes — public URL from `portfolio` bucket |
| `show_email` | `bool` | Default false |
| `show_phone` | `bool` | Default false |
| `updated_at` | `timestamptz` | Auto |

---

## List tables

All list tables share these common columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `position` | `int4` | 0-based display order (admin reorders by swapping) |
| `visible` | `bool` | Frontend only shows `visible = true` rows |
| `updated_at` | `timestamptz` | Auto-updated by DB trigger |

### `social_links`

| Column | Type | Nullable |
|---|---|---|
| `label` | `text` | No |
| `url` | `text` | No |
| `icon` | `text` | Yes — lucide icon name string |

### `overview_rows`

Key-value pairs shown in the About section overview grid.

| Column | Type | Nullable |
|---|---|---|
| `label` | `text` | No |
| `value` | `text` | No |

### `competencies`

Single-column bullet list of core competencies.

| Column | Type | Nullable |
|---|---|---|
| `text` | `text` | No |

### `skill_domains`

| Column | Type | Nullable |
|---|---|---|
| `title` | `text` | No |
| `tools` | `text[]` | No — array of tool/skill names |
| `status` | `text` | No — e.g. "Expert", "Proficient" |

### `projects`

| Column | Type | Nullable |
|---|---|---|
| `featured` | `bool` | No |
| `kicker` | `text` | Yes |
| `title` | `text` | No |
| `summary` | `text` | Yes |
| `outcome` | `text` | Yes |
| `tagline` | `text` | Yes |
| `bullets` | `text[]` | No |
| `tech` | `text[]` | No |
| `github_url` | `text` | Yes |
| `live_url` | `text` | Yes |
| `cover_url` | `text` | Yes — public URL from `portfolio` bucket |
| `files` | `jsonb` | Array of `ProjectFile` — see shape below |

#### `projects.files` shape

```jsonc
[
  {
    "name": "architecture.pdf",
    "url": "https://…/storage/v1/object/public/project-documents/…",
    "path": "project-documents/<project-id>/architecture.pdf",
    "type": "application/pdf"
  }
]
```

### `education`

| Column | Type | Nullable |
|---|---|---|
| `degree` | `text` | No |
| `institution` | `text` | No |
| `score_label` | `text` | No — e.g. "GPA", "Percentage" |
| `score` | `text` | Yes |
| `note` | `text` | Yes |

### `certifications`

| Column | Type | Nullable |
|---|---|---|
| `title` | `text` | No |
| `issuer` | `text` | No |
| `start_date` | `date` | Yes — ISO format YYYY-MM-DD |
| `end_date` | `date` | Yes |
| `credential_url` | `text` | Yes |
| `featured` | `bool` | No |

### `publications`

| Column | Type | Nullable |
|---|---|---|
| `title` | `text` | No |
| `venue` | `text` | Yes |
| `published_on` | `date` | Yes |
| `summary` | `text` | Yes |
| `reference` | `text` | Yes |
| `url` | `text` | Yes |

### `sections`

Flexible content sections ordered in the portfolio.

| Column | Type | Nullable |
|---|---|---|
| `slug` | `text` | No — unique, URL-safe identifier |
| `type` | `text` | No — see section types |
| `nav_label` | `text` | Yes |
| `eyebrow` | `text` | Yes |
| `title` | `text` | Yes |
| `subtitle` | `text` | Yes |
| `content` | `jsonb` | Yes — shape depends on `type` |
| `show_in_nav` | `bool` | No — controls nav visibility independently of `visible` |

#### Section types and content shapes

**Built-in types** (data lives in dedicated tables, `content` is supplementary metadata):

- `about` — Uses `overview_rows`, `competencies`
- `skills` — Uses `skill_domains`
- `projects` — Uses `projects`
- `publications` — Uses `publications`
- `education` — Uses `education`
- `certifications` — Uses `certifications`
- `contact` — Uses `social_links` and `profile` email/phone

**Custom types** (data stored in `content` jsonb):

```jsonc
// type = "rich_text"
{ "body": "Markdown or plain text content" }

// type = "cards"
{
  "items": [
    { "title": "Card title", "text": "Card body", "url": "https://…" }
  ]
}

// type = "gallery"
{
  "images": [
    { "url": "https://…/portfolio/sections/<slug>/image.jpg", "caption": "Alt text" }
  ]
}
```

---

## Inbox table

### `messages`

Incoming contact form submissions. **Admin-read only** — never inserted by admin.

| Column | Type | Nullable |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | No |
| `email` | `text` | No |
| `subject` | `text` | Yes |
| `body` | `text` | No |
| `is_read` | `bool` | No — updated by admin |
| `created_at` | `timestamptz` | No |

---

## Special rows

### `content_version` (id = 1)

A single-row table that the frontend watches via Supabase Realtime.
When any list table is modified the DB trigger bumps `version` and updates `updated_at`.

| Column | Type |
|---|---|
| `id` | `int4` |
| `version` | `int4` |
| `updated_at` | `timestamptz` |

### `admins`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Must match `auth.users.id` |

---

## Public view

### `public_profile`

A read-only view that merges `site_settings` and `profile` for the public API.
Only exposed columns that are safe to be public are included.

---

## Storage buckets

| Bucket | Max size | Allowed MIME types | Notes |
|---|---|---|---|
| `portfolio` | 10 MB per file | `image/*`, `application/pdf` | General assets: avatar, resume, section gallery images |
| `project-documents` | 20 MB per file | `application/pdf`, `image/*` | Per-project downloadable files |

### Path conventions

| Asset | Path |
|---|---|
| Profile avatar | `portfolio/avatar/<filename>` |
| Profile resume | `portfolio/resume/<filename>` |
| Section gallery image | `portfolio/sections/<slug>/<filename>` |
| Project cover image | `portfolio/projects/<project-id>/cover/<filename>` |
| Project document | `project-documents/<project-id>/<filename>` |

All URLs are public (no auth required to read).

---

## Which rows are public

The frontend only renders rows where **`visible = true`**.
The `show_email` and `show_phone` boolean columns on `profile` gate contact detail visibility.
`sections.show_in_nav` gates nav menu inclusion independently of `sections.visible`.
