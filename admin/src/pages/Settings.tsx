import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidUrl } from '../lib/validation'
import { PageHeader, Field, TextArea, TagInput, useToast } from '../components/ui'
import type {
  SiteSettingsRow,
  SiteHeroJson,
  SiteFooterJson,
  SiteSeoJson,
  SiteHeroStat,
} from '../types/rows'

export default function Settings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Brand form state
  const [brand, setBrand] = useState({
    brand_name: '',
    logo_text: '',
    nav_cta_label: '',
  })
  const [savingBrand, setSavingBrand] = useState(false)
  const [brandError, setBrandError] = useState<string | null>(null)

  // Hero form state
  const [hero, setHero] = useState<SiteHeroJson>({
    ghost_word: '',
    roles: [],
    tagline: '',
    cta_primary: { label: '', target: '' },
    cta_secondary: { label: '', target: '' },
    chips_left: [],
    chips_right: [],
    stats: [],
  })
  const [savingHero, setSavingHero] = useState(false)
  const [heroError, setHeroError] = useState<string | null>(null)

  // Footer form state
  const [footer, setFooter] = useState<SiteFooterJson>({
    blurb: '',
    index_title: '',
    direct_title: '',
    status_label: '',
    copyright: '',
  })
  const [savingFooter, setSavingFooter] = useState(false)
  const [footerError, setFooterError] = useState<string | null>(null)

  // SEO form state
  const [seo, setSeo] = useState<SiteSeoJson>({
    title: '',
    description: '',
  })
  const [savingSeo, setSavingSeo] = useState(false)
  const [seoError, setSeoError] = useState<string | null>(null)

  // Fetch initial site_settings (id = 1)
  const fetchSettings = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error
      const row = data as unknown as SiteSettingsRow

      setBrand({
        brand_name: row.brand_name || '',
        logo_text: row.logo_text || '',
        nav_cta_label: row.nav_cta_label || '',
      })

      const heroData = row.hero || {}
      setHero({
        ghost_word: heroData.ghost_word || '',
        roles: Array.isArray(heroData.roles) ? heroData.roles : [],
        tagline: heroData.tagline || '',
        cta_primary: {
          label: heroData.cta_primary?.label || '',
          target: heroData.cta_primary?.target || '',
        },
        cta_secondary: {
          label: heroData.cta_secondary?.label || '',
          target: heroData.cta_secondary?.target || '',
        },
        chips_left: Array.isArray(heroData.chips_left) ? heroData.chips_left : [],
        chips_right: Array.isArray(heroData.chips_right) ? heroData.chips_right : [],
        stats: Array.isArray(heroData.stats) ? heroData.stats : [],
      })

      const footerData = row.footer || {}
      setFooter({
        blurb: footerData.blurb || '',
        index_title: footerData.index_title || '',
        direct_title: footerData.direct_title || '',
        status_label: footerData.status_label || '',
        copyright: footerData.copyright || '',
      })

      const seoData = row.seo || {}
      setSeo({
        title: seoData.title || '',
        description: seoData.description || '',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFetchError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSettings()
  }, [])

  // 1. Save Brand
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBrand(true)
    setBrandError(null)

    try {
      if (!brand.brand_name.trim()) throw new Error('Brand name is required.')
      if (!brand.logo_text.trim()) throw new Error('Logo text is required.')

      const { data, error } = await supabase
        .from('site_settings')
        .update({
          brand_name: brand.brand_name.trim(),
          logo_text: brand.logo_text.trim(),
          nav_cta_label: brand.nav_cta_label.trim(),
        })
        .eq('id', 1)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was updated. Check your permissions and try again.')
      }

      toast.success('Brand settings saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setBrandError(msg)
      toast.error(msg)
    } finally {
      setSavingBrand(false)
    }
  }

  // 2. Save Hero
  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingHero(true)
    setHeroError(null)

    try {
      if (
        hero.cta_primary?.target &&
        hero.cta_primary.target.startsWith('http') &&
        !isValidUrl(hero.cta_primary.target)
      ) {
        throw new Error('Primary CTA target must be a valid URL starting with http:// or https://')
      }
      if (
        hero.cta_secondary?.target &&
        hero.cta_secondary.target.startsWith('http') &&
        !isValidUrl(hero.cta_secondary.target)
      ) {
        throw new Error('Secondary CTA target must be a valid URL starting with http:// or https://')
      }

      // Merge into latest hero JSON to preserve unknown keys
      const { data: latest, error: fetchErr } = await supabase
        .from('site_settings')
        .select('hero')
        .eq('id', 1)
        .single()
      if (fetchErr) throw fetchErr

      const currentHero = (latest?.hero && typeof latest.hero === 'object' ? latest.hero : {}) as Record<string, unknown>
      const mergedHero = {
        ...currentHero,
        ...hero,
      }

      const { data, error } = await supabase
        .from('site_settings')
        .update({ hero: mergedHero })
        .eq('id', 1)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was updated. Check your permissions and try again.')
      }

      toast.success('Hero settings saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setHeroError(msg)
      toast.error(msg)
    } finally {
      setSavingHero(false)
    }
  }

  // 3. Save Footer
  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFooter(true)
    setFooterError(null)

    try {
      const { data: latest, error: fetchErr } = await supabase
        .from('site_settings')
        .select('footer')
        .eq('id', 1)
        .single()
      if (fetchErr) throw fetchErr

      const currentFooter = (latest?.footer && typeof latest.footer === 'object' ? latest.footer : {}) as Record<string, unknown>
      const mergedFooter = {
        ...currentFooter,
        ...footer,
      }

      const { data, error } = await supabase
        .from('site_settings')
        .update({ footer: mergedFooter })
        .eq('id', 1)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was updated. Check your permissions and try again.')
      }

      toast.success('Footer settings saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setFooterError(msg)
      toast.error(msg)
    } finally {
      setSavingFooter(false)
    }
  }

  // 4. Save SEO
  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSeo(true)
    setSeoError(null)

    try {
      const { data: latest, error: fetchErr } = await supabase
        .from('site_settings')
        .select('seo')
        .eq('id', 1)
        .single()
      if (fetchErr) throw fetchErr

      const currentSeo = (latest?.seo && typeof latest.seo === 'object' ? latest.seo : {}) as Record<string, unknown>
      const mergedSeo = {
        ...currentSeo,
        ...seo,
      }

      const { data, error } = await supabase
        .from('site_settings')
        .update({ seo: mergedSeo })
        .eq('id', 1)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was updated. Check your permissions and try again.')
      }

      toast.success('SEO settings saved.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSeoError(msg)
      toast.error(msg)
    } finally {
      setSavingSeo(false)
    }
  }

  // Hero Stats Repeater helpers
  const handleAddStat = () => {
    const currentStats = hero.stats || []
    setHero({
      ...hero,
      stats: [...currentStats, { label: '', value: '' }],
    })
  }

  const handleStatChange = (index: number, field: keyof SiteHeroStat, val: string) => {
    const currentStats = [...(hero.stats || [])]
    currentStats[index] = {
      ...currentStats[index],
      [field]: val,
    }
    setHero({ ...hero, stats: currentStats })
  }

  const handleRemoveStat = (index: number) => {
    const currentStats = (hero.stats || []).filter((_, i) => i !== index)
    setHero({ ...hero, stats: currentStats })
  }

  const handleMoveStat = (index: number, direction: 'up' | 'down') => {
    const currentStats = [...(hero.stats || [])]
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentStats.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = currentStats[index]
    currentStats[index] = currentStats[targetIndex]
    currentStats[targetIndex] = temp
    setHero({ ...hero, stats: currentStats })
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
        <button type="button" onClick={() => void fetchSettings()} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Configuration"
        title="Site & Hero"
        description="Edit brand settings, hero presentation, footer information, and search engine metadata."
      />

      {/* SECTION 1: BRAND */}
      <section className="card p-6 border-line">
        <div className="mb-6">
          <p className="eyebrow mb-1">Identity</p>
          <h2 className="text-xl font-bold text-ink">Brand</h2>
          <p className="text-xs text-muted mt-1">
            Configure logo text, brand name, and the navigation call-to-action button.
          </p>
        </div>

        <form onSubmit={handleSaveBrand} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field
              label="Brand Name"
              required
              value={brand.brand_name}
              onChange={(e) => setBrand({ ...brand, brand_name: e.target.value })}
              placeholder="e.g. Harikrishanan"
            />
            <Field
              label="Logo Text"
              required
              value={brand.logo_text}
              onChange={(e) => setBrand({ ...brand, logo_text: e.target.value })}
              placeholder="e.g. HK"
            />
            <Field
              label="Nav CTA Button Label"
              value={brand.nav_cta_label}
              onChange={(e) => setBrand({ ...brand, nav_cta_label: e.target.value })}
              placeholder="e.g. Get in touch"
            />
          </div>

          {brandError && <p className="text-xs text-rose-400">{brandError}</p>}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingBrand}
              className="btn-primary flex items-center gap-2"
            >
              {savingBrand && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingBrand ? 'Saving...' : 'Save Brand'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: HERO */}
      <section className="card p-6 border-line">
        <div className="mb-6">
          <p className="eyebrow mb-1">Main Banner</p>
          <h2 className="text-xl font-bold text-ink">Hero</h2>
          <p className="text-xs text-muted mt-1">
            Hero banner presentation, tags, call-to-actions, and statistics repeater.
          </p>
        </div>

        <form onSubmit={handleSaveHero} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Ghost Word (Background Watermark)"
              value={hero.ghost_word || ''}
              onChange={(e) => setHero({ ...hero, ghost_word: e.target.value })}
              placeholder="e.g. ARCHITECT"
            />
            <Field
              label="Tagline"
              value={hero.tagline || ''}
              onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
              placeholder="e.g. Building resilient cloud architectures and performant web apps"
            />
          </div>

          <TagInput
            label="Roles (Title Rotator)"
            value={hero.roles || []}
            onChange={(roles) => setHero({ ...hero, roles })}
            placeholder="Type role and press Enter..."
            hint="Press Enter or comma to add each role"
          />

          <div className="border border-line p-4 space-y-4 bg-bg/40">
            <p className="eyebrow">Call to Action Buttons</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-mono text-muted uppercase">Primary CTA</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    label="Label"
                    value={hero.cta_primary?.label || ''}
                    onChange={(e) =>
                      setHero({
                        ...hero,
                        cta_primary: {
                          label: e.target.value,
                          target: hero.cta_primary?.target || '',
                        },
                      })
                    }
                    placeholder="e.g. View Projects"
                  />
                  <Field
                    label="Target (#anchor or URL)"
                    value={hero.cta_primary?.target || ''}
                    onChange={(e) =>
                      setHero({
                        ...hero,
                        cta_primary: {
                          label: hero.cta_primary?.label || '',
                          target: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. #projects"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-mono text-muted uppercase">Secondary CTA</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field
                    label="Label"
                    value={hero.cta_secondary?.label || ''}
                    onChange={(e) =>
                      setHero({
                        ...hero,
                        cta_secondary: {
                          label: e.target.value,
                          target: hero.cta_secondary?.target || '',
                        },
                      })
                    }
                    placeholder="e.g. Contact Me"
                  />
                  <Field
                    label="Target (#anchor or URL)"
                    value={hero.cta_secondary?.target || ''}
                    onChange={(e) =>
                      setHero({
                        ...hero,
                        cta_secondary: {
                          label: hero.cta_secondary?.label || '',
                          target: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. #contact"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TagInput
              label="Chips Left (Floating Badges)"
              value={hero.chips_left || []}
              onChange={(chips_left) => setHero({ ...hero, chips_left })}
              placeholder="Add badge..."
            />
            <TagInput
              label="Chips Right (Floating Badges)"
              value={hero.chips_right || []}
              onChange={(chips_right) => setHero({ ...hero, chips_right })}
              placeholder="Add badge..."
            />
          </div>

          {/* Stats Repeater */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Statistics</p>
                <p className="text-xs text-muted">Numerical achievements shown in the hero section</p>
              </div>
              <button
                type="button"
                onClick={handleAddStat}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase tracking-wider border border-line bg-surface hover:text-ink hover:border-accent transition-colors"
              >
                <Plus className="size-3.5" /> Add Stat
              </button>
            </div>

            <div className="space-y-2">
              {(hero.stats || []).map((stat, i) => (
                <div key={i} className="flex items-center gap-2 p-2 border border-line bg-surface">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => handleStatChange(i, 'label', e.target.value)}
                      placeholder="Label (e.g. Years Experience)"
                      className="input py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => handleStatChange(i, 'value', e.target.value)}
                      placeholder="Value (e.g. 8+)"
                      className="input py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => handleMoveStat(i, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-30 border border-line bg-bg transition-colors"
                      aria-label="Move stat up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={i === (hero.stats || []).length - 1}
                      onClick={() => handleMoveStat(i, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-30 border border-line bg-bg transition-colors"
                      aria-label="Move stat down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStat(i)}
                      className="p-1.5 text-muted hover:text-rose-400 border border-line bg-bg transition-colors"
                      aria-label="Remove stat"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {(hero.stats || []).length === 0 && (
                <p className="text-xs text-muted font-mono py-2 italic">No stats added yet.</p>
              )}
            </div>
          </div>

          {heroError && <p className="text-xs text-rose-400">{heroError}</p>}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingHero}
              className="btn-primary flex items-center gap-2"
            >
              {savingHero && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingHero ? 'Saving...' : 'Save Hero'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 3: FOOTER */}
      <section className="card p-6 border-line">
        <div className="mb-6">
          <p className="eyebrow mb-1">Page Bottom</p>
          <h2 className="text-xl font-bold text-ink">Footer</h2>
          <p className="text-xs text-muted mt-1">
            Footer blurb, column section titles, availability status, and copyright text.
          </p>
        </div>

        <form onSubmit={handleSaveFooter} className="space-y-4">
          <TextArea
            label="Footer Blurb"
            value={footer.blurb || ''}
            onChange={(e) => setFooter({ ...footer, blurb: e.target.value })}
            rows={3}
            placeholder="A short closing statement or bio shown at the footer"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Index Column Title"
              value={footer.index_title || ''}
              onChange={(e) => setFooter({ ...footer, index_title: e.target.value })}
              placeholder="e.g. Navigation"
            />
            <Field
              label="Direct Column Title"
              value={footer.direct_title || ''}
              onChange={(e) => setFooter({ ...footer, direct_title: e.target.value })}
              placeholder="e.g. Direct Contact"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Status Label"
              value={footer.status_label || ''}
              onChange={(e) => setFooter({ ...footer, status_label: e.target.value })}
              placeholder="e.g. Available for opportunities"
            />
            <Field
              label="Copyright Text"
              value={footer.copyright || ''}
              onChange={(e) => setFooter({ ...footer, copyright: e.target.value })}
              placeholder="e.g. © 2026 Harikrishanan. All rights reserved."
            />
          </div>

          {footerError && <p className="text-xs text-rose-400">{footerError}</p>}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingFooter}
              className="btn-primary flex items-center gap-2"
            >
              {savingFooter && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingFooter ? 'Saving...' : 'Save Footer'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 4: SEO */}
      <section className="card p-6 border-line">
        <div className="mb-6">
          <p className="eyebrow mb-1">Meta Tags</p>
          <h2 className="text-xl font-bold text-ink">Search Engine Optimization (SEO)</h2>
          <p className="text-xs text-muted mt-1">
            Browser tab title and search engine summary description.
          </p>
        </div>

        <form onSubmit={handleSaveSeo} className="space-y-4">
          <Field
            label="Page Title"
            value={seo.title || ''}
            onChange={(e) => setSeo({ ...seo, title: e.target.value })}
            placeholder="e.g. Harikrishanan | Senior Full Stack Engineer"
          />

          <TextArea
            label="Meta Description"
            value={seo.description || ''}
            onChange={(e) => setSeo({ ...seo, description: e.target.value })}
            rows={3}
            placeholder="Summary for search results and social previews..."
          />

          {seoError && <p className="text-xs text-rose-400">{seoError}</p>}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSeo}
              className="btn-primary flex items-center gap-2"
            >
              {savingSeo && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingSeo ? 'Saving...' : 'Save SEO'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
