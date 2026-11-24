import { useEffect, useState, useRef } from 'react'
import {
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidEmail, isValidUrl } from '../lib/validation'
import { useCrud } from '../lib/useCrud'
import {
  PageHeader,
  Field,
  TextArea,
  Toggle,
  ImageUpload,
  FileUpload,
  ConfirmButton,
  EmptyState,
  useToast,
} from '../components/ui'
import { SocialIcon, SOCIAL_ICON_OPTIONS, type SocialIconType } from '../components/SocialIcon'
import type { ProfileRow, SocialLinkRow } from '../types/rows'

export default function Profile() {
  const { toast } = useToast()

  // Profile state
  const [profile, setProfile] = useState<ProfileRow>({
    id: 1,
    full_name: '',
    headline: '',
    summary: '',
    email: '',
    phone: '',
    location: '',
    avatar_url: null,
    resume_url: null,
    show_email: true,
    show_phone: false,
  })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const profileErrorRef = useRef<HTMLParagraphElement>(null)

  // Social links CRUD via useCrud
  const {
    rows: socialLinks,
    loading: loadingSocials,
    error: socialsError,
    save: saveSocial,
    remove: removeSocial,
    move: moveSocial,
    toggle: toggleSocial,
  } = useCrud<SocialLinkRow>('social_links', { orderBy: 'position', ascending: true })

  // Social link editor form state
  const [editingSocial, setEditingSocial] = useState<Partial<SocialLinkRow> | null>(null)
  const [savingSocial, setSavingSocial] = useState(false)
  const [socialFormError, setSocialFormError] = useState<string | null>(null)
  const socialErrorRef = useRef<HTMLParagraphElement>(null)

  // Fetch initial profile (id = 1)
  const fetchProfile = async () => {
    setLoadingProfile(true)
    setProfileError(null)
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('id', 1)
        .single()

      if (error) throw error
      const row = data as unknown as ProfileRow

      setProfile({
        id: 1,
        full_name: row.full_name || '',
        headline: row.headline || '',
        summary: row.summary || '',
        email: row.email || '',
        phone: row.phone || '',
        location: row.location || '',
        avatar_url: row.avatar_url || null,
        resume_url: row.resume_url || null,
        show_email: row.show_email ?? true,
        show_phone: row.show_phone ?? false,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setProfileError(msg)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    void fetchProfile()
  }, [])

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError(null)

    try {
      if (!profile.full_name.trim()) throw new Error('Full name is required.')
      if (profile.email && !isValidEmail(profile.email)) {
        throw new Error('Please enter a valid email address.')
      }

      const { data, error } = await supabase
        .from('profile')
        .update({
          full_name: profile.full_name.trim(),
          headline: profile.headline?.trim() || null,
          summary: profile.summary?.trim() || null,
          email: profile.email?.trim() || null,
          phone: profile.phone?.trim() || null,
          location: profile.location?.trim() || null,
          avatar_url: profile.avatar_url || null,
          resume_url: profile.resume_url || null,
          show_email: profile.show_email,
          show_phone: profile.show_phone,
        })
        .eq('id', 1)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('No row was updated. Check your permissions and try again.')
      }
      toast.success('Profile updated successfully.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setProfileError(msg)
      toast.error(msg)
      profileErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => profileErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingProfile(false)
    }
  }

  // Open add social link form
  const handleNewSocial = () => {
    setEditingSocial({
      label: '',
      url: '',
      icon: 'github',
      visible: true,
    })
    setSocialFormError(null)
  }

  // Save social link
  const handleSaveSocial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSocial) return

    setSavingSocial(true)
    setSocialFormError(null)

    try {
      if (!editingSocial.label?.trim()) throw new Error('Label is required.')
      if (!editingSocial.url?.trim()) throw new Error('URL is required.')
      if (!isValidUrl(editingSocial.url)) {
        throw new Error('URL must start with http:// or https://')
      }

      await saveSocial({
        ...editingSocial,
        label: editingSocial.label.trim(),
        url: editingSocial.url.trim(),
      })

      toast.success(editingSocial.id ? 'Social link updated.' : 'Social link created.')
      setEditingSocial(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setSocialFormError(msg)
      toast.error(msg)
      socialErrorRef.current?.scrollIntoView({ block: 'center' })
      setTimeout(() => socialErrorRef.current?.scrollIntoView({ block: 'center' }), 0)
    } finally {
      setSavingSocial(false)
    }
  }

  // Delete social link
  const handleDeleteSocial = async (id: string) => {
    try {
      await removeSocial(id)
      toast.success('Social link removed.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    }
  }

  // Toggle social link visibility
  const handleToggleVisible = async (id: string) => {
    try {
      await toggleSocial(id, 'visible')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    }
  }

  // Move social link up/down
  const handleMoveSocial = async (id: string, direction: 'up' | 'down') => {
    try {
      await moveSocial(id, direction)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(msg)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="size-8 text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Personal Info"
        title="Profile"
        description="Edit your biographical details, avatar, resume document, and public social profile links."
      />

      {/* SECTION 1: PROFILE DETAILS */}
      <section className="card p-6 border-line">
        <div className="mb-6">
          <p className="eyebrow mb-1">Details & Media</p>
          <h2 className="text-xl font-bold text-ink">Personal Profile</h2>
          <p className="text-xs text-muted mt-1">
            Core information rendered across the portfolio header, hero, and contact cards.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              required
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="e.g. Harikrishanan"
            />
            <Field
              label="Headline"
              value={profile.headline || ''}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              placeholder="e.g. Senior Full Stack Engineer & Cloud Architect"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Email Address"
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="e.g. hello@example.com"
            />
            <Field
              label="Phone Number"
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. +1 (555) 000-0000"
            />
            <Field
              label="Location"
              value={profile.location || ''}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-line p-4 bg-bg/40">
            <Toggle
              label="Display email publicly"
              description="Show email address in the hero and contact sections"
              checked={profile.show_email}
              onChange={(checked) => setProfile({ ...profile, show_email: checked })}
            />
            <Toggle
              label="Display phone publicly"
              description="Show phone number in the hero and contact sections"
              checked={profile.show_phone}
              onChange={(checked) => setProfile({ ...profile, show_phone: checked })}
            />
          </div>

          <TextArea
            label="Summary / Bio"
            value={profile.summary || ''}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            rows={4}
            placeholder="A compelling overview of your expertise, passions, and background..."
          />

          {/* Media: Avatar & Resume */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-line">
            <div>
              <ImageUpload
                bucket="portfolio"
                folder="profile"
                value={profile.avatar_url}
                onChange={(url) => setProfile({ ...profile, avatar_url: url })}
                label="Avatar Photo"
                hint="PNG, JPG, WEBP, AVIF up to 10 MB"
              />
            </div>

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                Resume Document (PDF)
              </p>
              {profile.resume_url ? (
                <div className="border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 border border-line bg-bg text-accent shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">Resume PDF</p>
                        <p className="text-xs text-muted truncate">{profile.resume_url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={profile.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                        title="View resume"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setProfile({ ...profile, resume_url: null })}
                        className="p-1.5 border border-line bg-bg text-muted hover:text-rose-400 transition-colors"
                        title="Remove resume"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <FileUpload
                  bucket="portfolio"
                  folder="resume"
                  accept=".pdf,application/pdf"
                  onUploaded={(file) => setProfile({ ...profile, resume_url: file.url })}
                  hint="Upload your official resume in PDF format (up to 10 MB)"
                />
              )}
            </div>
          </div>

          {profileError && <p ref={profileErrorRef} className="text-xs text-rose-400">{profileError}</p>}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="btn-primary flex items-center gap-2"
            >
              {savingProfile && <Loader2 className="size-3.5 animate-spin" />}
              <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: SOCIAL LINKS CRUD */}
      <section className="card p-6 border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow mb-1">Online Presence</p>
            <h2 className="text-xl font-bold text-ink">Social Links</h2>
            <p className="text-xs text-muted mt-1">
              Links to your developer profiles, socials, and contact handles.
            </p>
          </div>
          {!editingSocial && (
            <button
              type="button"
              onClick={handleNewSocial}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-3 self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              <span>Add Social Link</span>
            </button>
          )}
        </div>

        {/* Modal / Form for Add / Edit Social Link */}
        {editingSocial && (
          <form
            onSubmit={handleSaveSocial}
            className="mb-6 p-4 border border-line bg-bg/60 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-line pb-2">
              <p className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                {editingSocial.id ? 'Edit Social Link' : 'New Social Link'}
              </p>
              <button
                type="button"
                onClick={() => setEditingSocial(null)}
                className="text-muted hover:text-ink p-1"
                aria-label="Close form"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Label"
                required
                value={editingSocial.label || ''}
                onChange={(e) => setEditingSocial({ ...editingSocial, label: e.target.value })}
                placeholder="e.g. GitHub"
              />

              <Field
                label="URL"
                required
                value={editingSocial.url || ''}
                onChange={(e) => setEditingSocial({ ...editingSocial, url: e.target.value })}
                placeholder="https://github.com/..."
                hint="Must start with http:// or https://"
              />

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-muted mb-1.5">
                  Icon
                </label>
                <div className="flex items-center gap-2">
                  <div className="p-2 border border-line bg-bg text-ink shrink-0">
                    <SocialIcon icon={editingSocial.icon} className="size-4" />
                  </div>
                  <select
                    value={editingSocial.icon || 'globe'}
                    onChange={(e) =>
                      setEditingSocial({
                        ...editingSocial,
                        icon: e.target.value as SocialIconType,
                      })
                    }
                    className="input py-2 text-xs"
                  >
                    {SOCIAL_ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Toggle
                label="Visible on website"
                checked={editingSocial.visible ?? true}
                onChange={(checked) => setEditingSocial({ ...editingSocial, visible: checked })}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSocial(null)}
                  disabled={savingSocial}
                  className="px-3 py-1.5 border border-line bg-surface text-xs font-mono uppercase tracking-wider text-muted hover:text-ink disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSocial}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {savingSocial && <Loader2 className="size-3 animate-spin" />}
                  <span>{savingSocial ? 'Saving...' : 'Save Link'}</span>
                </button>
              </div>
            </div>

            {socialFormError && <p ref={socialErrorRef} className="text-xs text-rose-400">{socialFormError}</p>}
          </form>
        )}

        {/* Social Links List */}
        {loadingSocials ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        ) : socialsError ? (
          <p className="text-xs text-rose-400 p-4 border border-line bg-surface">
            {socialsError}
          </p>
        ) : socialLinks.length === 0 ? (
          <EmptyState
            title="No social links configured"
            description="Add your profiles like GitHub, LinkedIn, or personal handles so visitors can reach you."
            action={{
              label: 'Add First Social Link',
              onClick: handleNewSocial,
            }}
          />
        ) : (
          <div className="space-y-2">
            {socialLinks.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 border border-line bg-surface hover:border-line/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 border border-line bg-bg text-ink shrink-0">
                    <SocialIcon icon={item.icon} className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{item.label}</span>
                      {!item.visible && (
                        <span className="font-mono text-[0.65rem] uppercase px-1.5 py-0.5 border border-line bg-bg text-muted">
                          Hidden
                        </span>
                      )}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted hover:text-accent truncate block mt-0.5 font-mono"
                    >
                      {item.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(item.id)}
                    className={`px-2 py-1 font-mono text-[0.7rem] uppercase tracking-wider border transition-colors ${
                      item.visible
                        ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                        : 'border-line bg-bg text-muted hover:text-ink'
                    }`}
                    title={item.visible ? 'Hide from site' : 'Show on site'}
                  >
                    {item.visible ? 'Visible' : 'Hidden'}
                  </button>

                  {/* Reorder Buttons */}
                  <div className="flex items-center border border-line bg-bg">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSocial(item.id, 'up')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors"
                      title="Move up"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === socialLinks.length - 1}
                      onClick={() => handleMoveSocial(item.id, 'down')}
                      className="p-1.5 text-muted hover:text-ink disabled:opacity-20 transition-colors border-l border-line"
                      title="Move down"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSocial({ ...item })
                      setSocialFormError(null)
                    }}
                    className="p-1.5 border border-line bg-bg text-muted hover:text-ink transition-colors"
                    title="Edit link"
                  >
                    <Pencil className="size-3.5" />
                  </button>

                  {/* Delete button with confirm */}
                  <ConfirmButton
                    onConfirm={() => handleDeleteSocial(item.id)}
                    confirmText="Delete link?"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
