import { z } from 'zod'
import { safeUrl } from './safeUrl'

// Helper: optional text that accepts null, undefined, or empty string, with optional max length
const optionalText = (maxLen?: number) => {
  const schema = z.string().nullable().optional()
  if (maxLen) {
    return schema.refine((val) => !val || val.length <= maxLen, {
      message: `Must be at most ${maxLen} characters`,
    })
  }
  return schema
}

// Helper: optional URL requiring http: or https:
const optionalHttpUrl = z
  .string()
  .nullable()
  .optional()
  .refine(
    (val) => !val || !val.trim() || safeUrl(val, { allowMailtoTel: false }) !== null,
    { message: 'URL must start with http:// or https://' }
  )

// Helper: social link URL allowing http:, https:, mailto:, tel:
const socialUrl = z
  .string()
  .min(1, 'URL is required')
  .refine(
    (val) => !val || !val.trim() || safeUrl(val, { allowMailtoTel: true }) !== null,
    { message: 'URL must start with http://, https://, mailto:, or tel:' }
  )

// Helper: optional dates (accepts null, empty string, YYYY-MM, or YYYY-MM-DD)
const optionalDate = z
  .string()
  .nullable()
  .optional()
  .refine(
    (val) => !val || !val.trim() || /^\d{4}-\d{2}(-\d{2})?$/.test(val.trim()),
    { message: 'Date must be formatted as YYYY-MM or YYYY-MM-DD' }
  )

// Helper: JSON text byte limit check
const jsonWithByteLimit = (limit: number, label: string) =>
  z
    .unknown()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (val === undefined || val === null) return true
        const text = typeof val === 'string' ? val : JSON.stringify(val)
        return new TextEncoder().encode(text).length <= limit
      },
      { message: `${label} exceeds maximum allowed size (${limit} bytes)` }
    )

/* =======================================================================
 * TABLE SCHEMAS
 * ======================================================================= */

export const socialLinkSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, 'Label is required').max(100),
  url: socialUrl,
  icon: optionalText(50),
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const overviewRowSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1, 'Label is required').max(200),
  value: z.string().min(1, 'Value is required').max(500),
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const competencySchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1, 'Competency text is required').max(500),
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const skillDomainSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Domain title is required').max(200),
  tools: z.array(z.string().max(100)).optional(),
  status: optionalText(100),
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const projectFileSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  path: z.string().min(1),
  type: z.string().optional(),
})

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(300),
  kicker: optionalText(100),
  summary: optionalText(5000),
  outcome: optionalText(2000),
  tagline: optionalText(500),
  bullets: z.array(z.string().max(1000)).optional(),
  tech: z.array(z.string().max(100)).optional(),
  github_url: optionalHttpUrl,
  live_url: optionalHttpUrl,
  cover_url: optionalHttpUrl,
  files: z
    .array(projectFileSchema)
    .optional()
    .refine(
      (files) => {
        if (!files) return true
        return new TextEncoder().encode(JSON.stringify(files)).length <= 100000
      },
      { message: 'Project files list exceeds 100 KB limit' }
    ),
  featured: z.boolean().optional(),
  visible: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  degree: z.string().min(1, 'Degree is required').max(300),
  institution: z.string().min(1, 'Institution is required').max(300),
  score_label: optionalText(100),
  score: optionalText(100),
  note: optionalText(1000),
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const certificationSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(300),
  issuer: z.string().min(1, 'Issuer is required').max(200),
  start_date: optionalDate,
  end_date: optionalDate,
  credential_url: optionalHttpUrl,
  featured: z.boolean().optional(),
  visible: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const publicationSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  venue: optionalText(300),
  published_on: optionalDate,
  summary: optionalText(5000),
  reference: optionalText(1000),
  url: optionalHttpUrl,
  position: z.number().int().optional(),
  visible: z.boolean().optional(),
})

export const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(60, 'Slug must be at most 60 characters')
    .regex(/^[a-z0-9-]{1,60}$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  type: z.string().min(1, 'Section type is required'),
  nav_label: optionalText(100),
  eyebrow: optionalText(100),
  title: optionalText(300),
  subtitle: optionalText(500),
  content: jsonWithByteLimit(200000, 'Section content'),
  show_in_nav: z.boolean().optional(),
  visible: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const profileSchema = z.object({
  id: z.number().optional(),
  full_name: z.string().min(1, 'Full name is required').max(300),
  headline: optionalText(300),
  summary: optionalText(5000),
  email: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || !val.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val.trim()),
      { message: 'Invalid email address format' }
    ),
  phone: optionalText(50),
  location: optionalText(200),
  avatar_url: optionalHttpUrl,
  resume_url: optionalHttpUrl,
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
})

export const siteSettingsSchema = z.object({
  id: z.number().optional(),
  brand_name: optionalText(100),
  logo_text: optionalText(100),
  nav_cta_label: optionalText(100),
  hero: jsonWithByteLimit(50000, 'Hero settings'),
  footer: jsonWithByteLimit(20000, 'Footer settings'),
  theme: jsonWithByteLimit(20000, 'Theme settings'),
  seo: jsonWithByteLimit(20000, 'SEO settings'),
})

export const messageSchema = z.object({
  id: z.string().uuid().optional(),
  name: optionalText(200),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), {
      message: 'Invalid email format',
    }),
  subject: optionalText(300),
  body: optionalText(10000),
  is_read: z.boolean().optional(),
})

export const TABLE_SCHEMAS: Record<string, z.ZodObject<z.ZodRawShape>> = {
  social_links: socialLinkSchema,
  overview_rows: overviewRowSchema,
  competencies: competencySchema,
  skill_domains: skillDomainSchema,
  projects: projectSchema,
  education: educationSchema,
  certifications: certificationSchema,
  publications: publicationSchema,
  sections: sectionSchema,
  profile: profileSchema,
  site_settings: siteSettingsSchema,
  messages: messageSchema,
}

export interface ValidationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string>
}

/**
 * Validates data for a given table schema.
 * When isPartial is true, uses .partial() so updates with a subset of fields validate correctly.
 */
export function validateTableData<T extends Record<string, unknown>>(
  table: string,
  data: T,
  isPartial = false
): ValidationResult<T> {
  const schema = TABLE_SCHEMAS[table]
  if (!schema) {
    return { success: true, data }
  }

  const targetSchema = isPartial ? schema.partial() : schema
  const result = targetSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data as T }
  }

  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'general'
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message
    }
  }

  const firstError = result.error.issues[0]?.message || 'Validation failed'
  return {
    success: false,
    error: firstError,
    fieldErrors,
  }
}
