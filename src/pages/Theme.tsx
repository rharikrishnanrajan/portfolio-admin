import { useEffect, useState, useRef } from 'react'
import { Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { withReadRetry } from '../lib/db'
import { friendlyErrorMessage } from '../lib/errors'
import { rgbStringToHex, hexToRgbString, contrastRatio } from '../lib/color'
import { siteSettingsSchema } from '../lib/schemas'
import { PageHeader, useToast } from '../components/ui'
import type {
  NavbarThemePalette,
  NavbarThemeStyle,
  SiteThemeJson,
  ThemePalette,
} from '../types/rows'

// ----- Constants -----
const HEADING_FONTS = ['Inter Variable', 'Georgia', 'Merriweather', 'Playfair Display', 'Raleway', 'Nunito']
const MONO_FONTS = ['JetBrains Mono Variable', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Courier New']

const TOKEN_LABELS: { key: keyof ThemePalette; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'border', label: 'Border' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted Text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accent2', label: 'Accent 2' },
]

type Preset = { label: string; accent: string; accent2: string }
const PRESETS: Preset[] = [
  { label: 'Blue', accent: '79 126 255', accent2: '199 210 254' },
  { label: 'Emerald', accent: '52 211 153', accent2: '167 243 208' },
  { label: 'Violet', accent: '139 92 246', accent2: '221 214 254' },
  { label: 'Amber', accent: '251 191 36', accent2: '253 230 138' },
  { label: 'Rose', accent: '244 63 94', accent2: '254 205 211' },
]

const DEFAULT_DARK: ThemePalette = {
  bg: '6 9 18',
  surface: '14 19 33',
  border: '30 38 58',
  text: '255 255 255',
  muted: '148 163 184',
  accent: '79 126 255',
  accent2: '199 210 254',
}

const DEFAULT_LIGHT: ThemePalette = {
  bg: '255 255 255',
  surface: '248 250 252',
  border: '226 232 240',
  text: '15 23 42',
  muted: '100 116 139',
  accent: '79 126 255',
  accent2: '67 56 202',
}

const NAVBAR_TOKEN_LABELS: { key: keyof NavbarThemePalette; label: string }[] = [
  { key: 'bg', label: 'Bar Background' },
  { key: 'border', label: 'Bar Border' },
  { key: 'text', label: 'Brand & Active' },
  { key: 'muted', label: 'Nav Links' },
  { key: 'pill_bg', label: 'Nav Pill Bg' },
  { key: 'active_bg', label: 'Active Pill Bg' },
  { key: 'active_text', label: 'Active Link Text' },
]

const NAVBAR_STYLES: { value: NavbarThemeStyle; label: string }[] = [
  { value: 'glass', label: 'Translucent (Glass)' },
  { value: 'solid', label: 'Solid Bar' },
  { value: 'transparent', label: 'Transparent (Minimal)' },
]

function paletteToNavPalette(p: ThemePalette): NavbarThemePalette {
  return {
    bg: p.bg,
    border: p.border,
    text: p.text,
    muted: p.muted,
    pill_bg: p.surface,
    active_bg: p.accent,
    active_text: p.accent,
  }
}

const DEFAULT_NAV_DARK: NavbarThemePalette = paletteToNavPalette(DEFAULT_DARK)
const DEFAULT_NAV_LIGHT: NavbarThemePalette = paletteToNavPalette(DEFAULT_LIGHT)

const DEFAULT_THEME: SiteThemeJson = {
  default_mode: 'dark',
  fonts: { heading: 'Inter Variable', mono: 'JetBrains Mono Variable' },
  dark: DEFAULT_DARK,
  light: DEFAULT_LIGHT,
  navbar: {
    style: 'glass',
    dark: DEFAULT_NAV_DARK,
    light: DEFAULT_NAV_LIGHT,
  },
}

// ---- Helper: clone palette ----
function clonePalette<T extends object>(p: T): T {
  return { ...p }
}

// ---- Contrast warning component ----
function ContrastCheck({ palette }: { palette: ThemePalette }) {
  const ratio = contrastRatio(palette.text, palette.bg)
  if (ratio >= 4.5) return null
  return (
    <div className="flex items-center gap-2 p-2.5 border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-mono">
      <AlertTriangle className="size-3.5 shrink-0" />
      <span>Text vs Background contrast is {ratio.toFixed(2)}:1 (WCAG AA requires 4.5:1)</span>
    </div>
  )
}

// ---- Color row ----
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const hex = rgbStringToHex(value)
  const [textValue, setTextValue] = useState(hex)

  useEffect(() => { setTextValue(rgbStringToHex(value)) }, [value])

  const handleHexInput = (v: string) => {
    setTextValue(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(hexToRgbString(v))
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label className="font-mono text-xs text-muted uppercase tracking-wider w-28 shrink-0">{label}</label>
      <input
        type="color"
        value={rgbStringToHex(value)}
        onChange={(e) => { onChange(hexToRgbString(e.target.value)); setTextValue(e.target.value) }}
        className="h-8 w-10 cursor-pointer border border-line rounded-none bg-transparent p-0"
        aria-label={`${label} color picker`}
      />
      <input
        type="text"
        value={textValue}
        onChange={(e) => handleHexInput(e.target.value)}
        onBlur={() => setTextValue(rgbStringToHex(value))}
        maxLength={7}
        className="input py-1.5 text-xs font-mono w-24"
        aria-label={`${label} hex value`}
        placeholder="#000000"
      />
      <span className="font-mono text-[0.65rem] text-muted">{value}</span>
    </div>
  )
}

// ---- Live preview component ----
function LivePreview({
  palette,
  navPalette,
  navStyle,
  headingFont,
  monoFont,
}: {
  palette: ThemePalette
  navPalette: NavbarThemePalette
  navStyle: NavbarThemeStyle
  headingFont: string
  monoFont: string
}) {
  const style: React.CSSProperties = {
    '--preview-bg': `rgb(${palette.bg})`,
    '--preview-surface': `rgb(${palette.surface})`,
    '--preview-border': `rgb(${palette.border})`,
    '--preview-text': `rgb(${palette.text})`,
    '--preview-muted': `rgb(${palette.muted})`,
    '--preview-accent': `rgb(${palette.accent})`,
    '--preview-accent2': `rgb(${palette.accent2})`,
    '--preview-nav-bg':
      navStyle === 'transparent'
        ? 'transparent'
        : navStyle === 'solid'
          ? `rgb(${navPalette.bg})`
          : `rgb(${navPalette.bg} / 0.85)`,
    '--preview-nav-border': navStyle === 'transparent' ? 'transparent' : `rgb(${navPalette.border})`,
    '--preview-nav-text': `rgb(${navPalette.text})`,
    '--preview-nav-muted': `rgb(${navPalette.muted})`,
    '--preview-nav-pill': `rgb(${navPalette.pill_bg} / 0.75)`,
    '--preview-nav-active-bg': `rgb(${navPalette.active_bg} / 0.15)`,
    '--preview-nav-active-text': `rgb(${navPalette.active_text})`,
  } as React.CSSProperties

  return (
    <div
      style={style}
      className="border border-line p-4 space-y-3 rounded-sm"
      aria-label="Theme live preview"
    >
      <style>{`
        .prev-wrap { background: var(--preview-bg); color: var(--preview-text); font-family: '${headingFont}', system-ui, sans-serif; border: 1px solid var(--preview-border); overflow: hidden; }
        .prev-navbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .65rem 1rem; background: var(--preview-nav-bg); border-bottom: 1px solid var(--preview-nav-border); backdrop-filter: ${navStyle === 'glass' ? 'blur(10px)' : 'none'}; }
        .prev-brand { display: inline-flex; align-items: center; gap: .5rem; font-size: .8rem; font-weight: 700; color: var(--preview-nav-text); }
        .prev-logo { display: inline-flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border: 1px solid rgb(${navPalette.border}); background: rgb(${navPalette.pill_bg}); font-family: '${monoFont}', monospace; font-size: .65rem; font-weight: 700; color: var(--preview-nav-text); }
        .prev-pill { display: inline-flex; align-items: center; gap: .25rem; padding: .2rem .4rem; border-radius: 9999px; border: 1px solid rgb(${navPalette.border}); background: var(--preview-nav-pill); font-family: '${monoFont}', monospace; font-size: .65rem; }
        .prev-pill-link { padding: .2rem .55rem; border-radius: 9999px; color: var(--preview-nav-muted); }
        .prev-pill-active { padding: .2rem .55rem; border-radius: 9999px; background: var(--preview-nav-active-bg); color: var(--preview-nav-active-text); font-weight: 600; }
        .prev-body { padding: 1rem; }
        .prev-card { background: var(--preview-surface); border: 1px solid var(--preview-border); padding: .75rem 1rem; }
        .prev-eyebrow { font-family: '${monoFont}', monospace; font-size: .65rem; letter-spacing: .2em; text-transform: uppercase; color: var(--preview-muted); }
        .prev-heading { font-size: 1.25rem; font-weight: 700; color: var(--preview-text); }
        .prev-muted { color: var(--preview-muted); font-size: .8rem; }
        .prev-btn { font-family: '${monoFont}', monospace; font-size: .7rem; letter-spacing: .15em; text-transform: uppercase; font-weight: 700; padding: .5rem 1rem; color: var(--preview-bg); background: linear-gradient(90deg, var(--preview-accent), var(--preview-accent2)); box-shadow: 0 0 20px rgb(${palette.accent}/.35); border: none; cursor: pointer; }
        .prev-chip { font-family: '${monoFont}', monospace; font-size: .65rem; padding: .2rem .5rem; border: 1px solid var(--preview-border); background: var(--preview-bg); color: var(--preview-text); }
      `}</style>
      <div className="prev-wrap">
        <div className="prev-navbar">
          <span className="prev-brand">
            <span className="prev-logo">HK</span>
            <span>Portfolio</span>
          </span>
          <div className="prev-pill">
            <span className="prev-pill-active">About</span>
            <span className="prev-pill-link">Projects</span>
            <span className="prev-pill-link">Skills</span>
          </div>
          <span className="prev-chip">Connect</span>
        </div>
        <div className="prev-body">
          <p className="prev-eyebrow mb-1">Preview</p>
          <div className="prev-card mb-3">
            <p className="prev-eyebrow">Section eyebrow</p>
            <h2 className="prev-heading">Theme Preview Card</h2>
            <p className="prev-muted">Surface card with muted supporting text.</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '.75rem' }}>
            <span className="prev-chip">mono chip</span>
            <span className="prev-chip">code</span>
          </div>
          <button className="prev-btn" type="button">Gradient Button</button>
        </div>
      </div>
    </div>
  )
}

export default function Theme() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveErrorRef = useRef<HTMLParagraphElement>(null)
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null)

  const [mode, setMode] = useState<'dark' | 'light'>('dark')
  const [headingFont, setHeadingFont] = useState(DEFAULT_THEME.fonts!.heading)
  const [monoFont, setMonoFont] = useState(DEFAULT_THEME.fonts!.mono)
  const [dark, setDark] = useState<ThemePalette>(clonePalette(DEFAULT_DARK))
  const [light, setLight] = useState<ThemePalette>(clonePalette(DEFAULT_LIGHT))
  const [navStyle, setNavStyle] = useState<NavbarThemeStyle>('glass')
  const [navDark, setNavDark] = useState<NavbarThemePalette>(clonePalette(DEFAULT_NAV_DARK))
  const [navLight, setNavLight] = useState<NavbarThemePalette>(clonePalette(DEFAULT_NAV_LIGHT))
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark')

  const fetchTheme = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await withReadRetry(async (signal) => {
        return await supabase
          .from('site_settings')
          .select('theme, updated_at')
          .eq('id', 1)
          .abortSignal(signal)
          .single()
      })
      if (error) throw error
      setLoadedUpdatedAt((data as { updated_at?: string })?.updated_at || null)
      const t = (data?.theme as SiteThemeJson) || {}
      setMode(t.default_mode || 'dark')
      setHeadingFont(t.fonts?.heading || DEFAULT_THEME.fonts!.heading)
      setMonoFont(t.fonts?.mono || DEFAULT_THEME.fonts!.mono)
      const resolvedDark = { ...DEFAULT_DARK, ...(t.dark || {}) }
      const resolvedLight = { ...DEFAULT_LIGHT, ...(t.light || {}) }
      setDark(resolvedDark)
      setLight(resolvedLight)
      setNavStyle(t.navbar?.style || 'glass')
      setNavDark({ ...paletteToNavPalette(resolvedDark), ...(t.navbar?.dark || {}) })
      setNavLight({ ...paletteToNavPalette(resolvedLight), ...(t.navbar?.light || {}) })
    } catch (err) {
      setFetchError(friendlyErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchTheme() }, [])

  const activePalette = previewMode === 'dark' ? dark : light
  const activeNavPalette = previewMode === 'dark' ? navDark : navLight
  const setActivePalette = previewMode === 'dark'
    ? (fn: (p: ThemePalette) => ThemePalette) => setDark(fn)
    : (fn: (p: ThemePalette) => ThemePalette) => setLight(fn)

  const applyPreset = (preset: Preset) => {
    setDark((d) => ({ ...d, accent: preset.accent, accent2: preset.accent2 }))
    setLight((l) => ({ ...l, accent: preset.accent, accent2: preset.accent2 }))
    toast.info(`Applied ${preset.label} preset.`)
  }

  const applyNavPreset = (preset: Preset) => {
    setNavDark((d) => ({ ...d, active_bg: preset.accent, active_text: preset.accent }))
    setNavLight((l) => ({ ...l, active_bg: preset.accent, active_text: preset.accent }))
    toast.info(`Applied ${preset.label} navbar accent preset.`)
  }

  const handleReset = () => {
    setMode(DEFAULT_THEME.default_mode!)
    setHeadingFont(DEFAULT_THEME.fonts!.heading)
    setMonoFont(DEFAULT_THEME.fonts!.mono)
    setDark(clonePalette(DEFAULT_DARK))
    setLight(clonePalette(DEFAULT_LIGHT))
    setNavStyle('glass')
    setNavDark(clonePalette(DEFAULT_NAV_DARK))
    setNavLight(clonePalette(DEFAULT_NAV_LIGHT))
    toast.info('Reset to default theme.')
  }

  const handleSyncNavWithPalette = () => {
    if (previewMode === 'dark') {
      setNavDark(paletteToNavPalette(dark))
    } else {
      setNavLight(paletteToNavPalette(light))
    }
    toast.info(`Synced ${previewMode} navbar colors with ${previewMode} palette.`)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      // Merge into existing theme JSON
      const { data: current, error: fetchErr } = await supabase
        .from('site_settings')
        .select('theme, updated_at')
        .eq('id', 1)
        .single()
      if (fetchErr) throw fetchErr

      const existing = ((current?.theme as Record<string, unknown>) || {})
      const merged = {
        ...existing,
        default_mode: mode,
        fonts: { heading: headingFont, mono: monoFont },
        dark,
        light,
        navbar: {
          style: navStyle,
          dark: navDark,
          light: navLight,
        },
      }

      const val = siteSettingsSchema.partial().safeParse({ theme: merged })
      if (!val.success) throw new Error(val.error.issues[0]?.message || 'Validation failed')

      let updateQuery = supabase
        .from('site_settings')
        .update({ theme: merged })
        .eq('id', 1)

      const targetUpdatedAt = (current as { updated_at?: string })?.updated_at || loadedUpdatedAt
      if (targetUpdatedAt) {
        updateQuery = updateQuery.eq('updated_at', targetUpdatedAt)
      }

      const { data, error } = await updateQuery.select()
      if (error) throw error
      if (!data || data.length === 0) {
        if (targetUpdatedAt) {
          throw new Error('This item was changed elsewhere. Reload and try again.')
        }
        throw new Error('No row updated. Check permissions.')
      }

      setLoadedUpdatedAt(data[0].updated_at)
      toast.success('Theme saved.')
    } catch (err) {
      const msg = friendlyErrorMessage(err)
      setSaveError(msg)
      toast.error(msg)
      saveErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => saveErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="size-8 text-accent animate-spin" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <p className="eyebrow text-rose-400 mb-2">Error</p>
        <p className="text-sm text-muted mb-4">{fetchError}</p>
        <button type="button" onClick={() => void fetchTheme()} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader
          eyebrow="Appearance"
          title="Theme Editor"
          description="Customize colors, fonts, and modes. The admin UI always uses the default dark theme — these changes only affect the public portfolio."
        />
        <button type="button" onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink transition-colors self-start shrink-0">
          <RotateCcw className="size-3.5" /> Reset to defaults
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* Mode & Fonts */}
        <section className="card p-6 border-line space-y-5">
          <div>
            <p className="eyebrow mb-1">Global Settings</p>
            <h2 className="text-lg font-bold text-ink">Mode &amp; Fonts</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Default Mode
              </label>
              <select value={mode} onChange={(e) => setMode(e.target.value as 'dark' | 'light')}
                className="input py-2 text-sm">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Heading Font
              </label>
              <select value={headingFont} onChange={(e) => setHeadingFont(e.target.value)} className="input py-2 text-sm">
                {HEADING_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Mono Font
              </label>
              <select value={monoFont} onChange={(e) => setMonoFont(e.target.value)} className="input py-2 text-sm">
                {MONO_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Accent Presets */}
        <section className="card p-6 border-line space-y-4">
          <div>
            <p className="eyebrow mb-1">Quick Presets</p>
            <h2 className="text-lg font-bold text-ink">Accent Colors</h2>
            <p className="text-xs text-muted mt-0.5">Applies accent and accent2 to both dark and light palettes.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="flex items-center gap-2 px-3 py-1.5 border border-line bg-surface hover:border-accent/50 transition-colors text-xs font-mono uppercase tracking-wider"
              >
                <span
                  className="size-3 inline-block rounded-full border border-line"
                  style={{ background: `rgb(${p.accent})` }}
                />
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Color Editor */}
        <section className="card p-6 border-line space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Colors</p>
              <h2 className="text-lg font-bold text-ink">Palette Editor</h2>
            </div>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActivePalette !== undefined && (() => {
                    // just switch the edit mode
                    const dummy = m
                    void dummy
                  })() || setPreviewMode(m)}
                  className={`px-3 py-1 font-mono text-xs uppercase tracking-wider border transition-colors ${
                    previewMode === m ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-bg text-muted hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <ContrastCheck palette={activePalette} />

          <div className="space-y-3">
            {TOKEN_LABELS.map(({ key, label }) => (
              <ColorRow
                key={key}
                label={label}
                value={activePalette[key]}
                onChange={(v) => {
                  if (previewMode === 'dark') {
                    setDark((d) => ({ ...d, [key]: v }))
                  } else {
                    setLight((l) => ({ ...l, [key]: v }))
                  }
                }}
              />
            ))}
          </div>
        </section>

        {/* Navigation Bar Theme */}
        <section className="card p-6 border-line space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Navigation</p>
              <h2 className="text-lg font-bold text-ink">Navigation Bar Theme</h2>
              <p className="text-xs text-muted mt-0.5">
                Customize the top navigation bar surface style and colors for dark and light modes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncNavWithPalette}
                className="px-3 py-1 font-mono text-xs uppercase tracking-wider border border-line bg-surface text-muted hover:text-ink transition-colors"
              >
                Sync with palette
              </button>
              {(['dark', 'light'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPreviewMode(m)}
                  className={`px-3 py-1 font-mono text-xs uppercase tracking-wider border transition-colors ${
                    previewMode === m ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-bg text-muted hover:text-ink'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-xs">
            <label
              htmlFor="navbar-style-select"
              className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5"
            >
              Navbar Surface Style
            </label>
            <select
              id="navbar-style-select"
              value={navStyle}
              onChange={(e) => setNavStyle(e.target.value as NavbarThemeStyle)}
              className="input py-2 text-sm"
            >
              {NAVBAR_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-line">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted">
                Quick Presets · Navbar Accent Colors
              </p>
              <p className="text-xs text-muted mt-0.5">
                Applies active pill background and active link accent to both dark and light navbar themes.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyNavPreset(p)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-line bg-surface hover:border-accent/50 transition-colors text-xs font-mono uppercase tracking-wider"
                >
                  <span
                    className="size-3 inline-block rounded-full border border-line"
                    style={{ background: `rgb(${p.accent})` }}
                  />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {NAVBAR_TOKEN_LABELS.map(({ key, label }) => (
              <ColorRow
                key={key}
                label={label}
                value={activeNavPalette[key]}
                onChange={(v) => {
                  if (previewMode === 'dark') {
                    setNavDark((d) => ({ ...d, [key]: v }))
                  } else {
                    setNavLight((l) => ({ ...l, [key]: v }))
                  }
                }}
              />
            ))}
          </div>
        </section>

        {/* Live Preview */}
        <section className="card p-6 border-line space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow mb-1">Preview</p>
              <h2 className="text-lg font-bold text-ink">Live Preview</h2>
            </div>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setPreviewMode(m)}
                  className={`px-3 py-1 font-mono text-xs uppercase tracking-wider border transition-colors ${
                    previewMode === m ? 'border-accent/50 bg-accent/15 text-accent' : 'border-line bg-bg text-muted hover:text-ink'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <LivePreview
            palette={activePalette}
            navPalette={activeNavPalette}
            navStyle={navStyle}
            headingFont={headingFont}
            monoFont={monoFont}
          />
        </section>

        {saveError && (
          <p ref={saveErrorRef} className="text-xs text-rose-400 p-2.5 border border-rose-500/30 bg-rose-500/10">{saveError}</p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 py-3 px-6">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Theme'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
