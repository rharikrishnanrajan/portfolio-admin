import { describe, it, expect } from 'vitest'
import {
  socialLinkSchema,
  profileSchema,
  certificationSchema,
  publicationSchema,
  projectSchema,
  sectionSchema,
  skillDomainSchema,
  educationSchema,
  overviewRowSchema,
  competencySchema,
  validateTableData,
} from './schemas'

// ---------------------------------------------------------------------------
// socialLinkSchema
// ---------------------------------------------------------------------------
describe('socialLinkSchema', () => {
  it('accepts https social link', () => {
    const result = socialLinkSchema.safeParse({ label: 'GitHub', url: 'https://github.com/user' })
    expect(result.success).toBe(true)
  })

  it('accepts mailto social link', () => {
    const result = socialLinkSchema.safeParse({ label: 'Email', url: 'mailto:user@example.com' })
    expect(result.success).toBe(true)
  })

  it('accepts tel social link', () => {
    const result = socialLinkSchema.safeParse({ label: 'Phone', url: 'tel:+1234567890' })
    expect(result.success).toBe(true)
  })

  it('rejects javascript: in social URL', () => {
    const result = socialLinkSchema.safeParse({ label: 'XSS', url: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('rejects missing label', () => {
    const result = socialLinkSchema.safeParse({ label: '', url: 'https://example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects missing URL', () => {
    const result = socialLinkSchema.safeParse({ label: 'Test', url: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// profileSchema
// ---------------------------------------------------------------------------
describe('profileSchema', () => {
  it('accepts valid profile', () => {
    const result = profileSchema.safeParse({
      full_name: 'Alice',
      headline: 'Developer',
      email: 'alice@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = profileSchema.safeParse({ full_name: 'Alice', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects javascript: avatar_url', () => {
    const result = profileSchema.safeParse({
      full_name: 'Alice',
      avatar_url: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('rejects javascript: resume_url', () => {
    const result = profileSchema.safeParse({
      full_name: 'Alice',
      resume_url: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('accepts null avatar_url', () => {
    const result = profileSchema.safeParse({ full_name: 'Alice', avatar_url: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing full_name', () => {
    const result = profileSchema.safeParse({ full_name: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// certificationSchema
// ---------------------------------------------------------------------------
describe('certificationSchema', () => {
  it('accepts valid certification', () => {
    const result = certificationSchema.safeParse({
      title: 'AWS Solutions Architect',
      issuer: 'Amazon',
      start_date: '2024-01',
      end_date: '2027-01',
      credential_url: 'https://cert.example.com/abc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty dates', () => {
    const result = certificationSchema.safeParse({
      title: 'AWS',
      issuer: 'Amazon',
      start_date: null,
      end_date: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = certificationSchema.safeParse({
      title: 'AWS',
      issuer: 'Amazon',
      start_date: '01/2024',
    })
    expect(result.success).toBe(false)
  })

  it('rejects javascript: credential_url', () => {
    const result = certificationSchema.safeParse({
      title: 'AWS',
      issuer: 'Amazon',
      credential_url: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = certificationSchema.safeParse({ title: '', issuer: 'Amazon' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// publicationSchema
// ---------------------------------------------------------------------------
describe('publicationSchema', () => {
  it('accepts valid publication', () => {
    const result = publicationSchema.safeParse({
      title: 'My Paper',
      venue: 'Nature',
      published_on: '2024-03-15',
      url: 'https://doi.org/10.1234/abc',
    })
    expect(result.success).toBe(true)
  })

  it('accepts missing optional fields', () => {
    const result = publicationSchema.safeParse({ title: 'My Paper' })
    expect(result.success).toBe(true)
  })

  it('rejects javascript: url', () => {
    const result = publicationSchema.safeParse({ title: 'My Paper', url: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('rejects data: url', () => {
    const result = publicationSchema.safeParse({ title: 'My Paper', url: 'data:text/html,test' })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const result = publicationSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// projectSchema
// ---------------------------------------------------------------------------
describe('projectSchema', () => {
  it('accepts valid project', () => {
    const result = projectSchema.safeParse({
      title: 'My Project',
      github_url: 'https://github.com/user/repo',
      live_url: 'https://myapp.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects javascript: in github_url', () => {
    const result = projectSchema.safeParse({
      title: 'My Project',
      github_url: 'javascript:alert(1)',
    })
    expect(result.success).toBe(false)
  })

  it('rejects data: in live_url', () => {
    const result = projectSchema.safeParse({
      title: 'My Project',
      live_url: 'data:text/html,<h1>XSS</h1>',
    })
    expect(result.success).toBe(false)
  })

  it('accepts empty optional URL fields', () => {
    const result = projectSchema.safeParse({ title: 'My Project', github_url: null })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = projectSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// sectionSchema — slug validation
// ---------------------------------------------------------------------------
describe('sectionSchema', () => {
  it('accepts valid slug with lowercase letters, numbers, hyphens', () => {
    const result = sectionSchema.safeParse({
      slug: 'my-section-01',
      type: 'rich_text',
    })
    expect(result.success).toBe(true)
  })

  it('rejects slug with uppercase letters', () => {
    const result = sectionSchema.safeParse({ slug: 'MySection', type: 'rich_text' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with spaces', () => {
    const result = sectionSchema.safeParse({ slug: 'my section', type: 'rich_text' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with path traversal characters', () => {
    const result = sectionSchema.safeParse({ slug: '../etc/passwd', type: 'rich_text' })
    expect(result.success).toBe(false)
  })

  it('rejects slug longer than 60 characters', () => {
    const result = sectionSchema.safeParse({
      slug: 'a'.repeat(61),
      type: 'rich_text',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing slug', () => {
    const result = sectionSchema.safeParse({ slug: '', type: 'rich_text' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// skillDomainSchema
// ---------------------------------------------------------------------------
describe('skillDomainSchema', () => {
  it('accepts valid skill domain', () => {
    const result = skillDomainSchema.safeParse({ title: 'Frontend', tools: ['React', 'TypeScript'] })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const result = skillDomainSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// educationSchema
// ---------------------------------------------------------------------------
describe('educationSchema', () => {
  it('accepts valid education entry', () => {
    const result = educationSchema.safeParse({ degree: 'B.Sc Computer Science', institution: 'MIT' })
    expect(result.success).toBe(true)
  })

  it('rejects missing degree', () => {
    const result = educationSchema.safeParse({ degree: '', institution: 'MIT' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// overviewRowSchema
// ---------------------------------------------------------------------------
describe('overviewRowSchema', () => {
  it('accepts valid overview row', () => {
    const result = overviewRowSchema.safeParse({ label: 'Location', value: 'London, UK' })
    expect(result.success).toBe(true)
  })

  it('rejects missing label', () => {
    const result = overviewRowSchema.safeParse({ label: '', value: 'London' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// competencySchema
// ---------------------------------------------------------------------------
describe('competencySchema', () => {
  it('accepts valid competency', () => {
    const result = competencySchema.safeParse({ text: 'TypeScript' })
    expect(result.success).toBe(true)
  })

  it('rejects empty text', () => {
    const result = competencySchema.safeParse({ text: '' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validateTableData helper
// ---------------------------------------------------------------------------
describe('validateTableData', () => {
  it('passes for unknown table (no schema registered)', () => {
    const result = validateTableData('unknown_table', { foo: 'bar' })
    expect(result.success).toBe(true)
  })

  it('validates social_links correctly', () => {
    const ok = validateTableData('social_links', { label: 'GitHub', url: 'https://github.com' })
    expect(ok.success).toBe(true)

    const fail = validateTableData('social_links', { label: '', url: 'javascript:x' })
    expect(fail.success).toBe(false)
  })

  it('provides fieldErrors on failure', () => {
    const result = validateTableData('social_links', { label: '', url: '' })
    expect(result.success).toBe(false)
    expect(result.fieldErrors).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('supports isPartial mode for updates', () => {
    // Partial: only url supplied — label missing, but that is OK in partial mode
    const result = validateTableData('social_links', { url: 'https://github.com' }, true)
    expect(result.success).toBe(true)
  })
})
