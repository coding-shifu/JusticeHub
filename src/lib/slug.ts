import { createAdminClient } from '@/lib/supabase/server'

/**
 * Generate a clean URL-friendly slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')             // Trim - from end of text
    .substring(0, 50)               // Cap length
    || 'firm'
}

/**
 * Generate a unique slug in the `firm` table by appending incremental suffixes if needed.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name)
  const adminSupabase = await createAdminClient()

  let uniqueSlug = baseSlug
  let counter = 1
  let exists = true

  while (exists) {
    const { data, error } = await adminSupabase
      .from('firm')
      .select('id')
      .eq('slug', uniqueSlug)
      .maybeSingle()

    // If there is an error or no match is found, we can use the current slug
    if (error || !data) {
      exists = false
    } else {
      uniqueSlug = `${baseSlug}-${counter}`
      counter++
    }
  }

  return uniqueSlug
}
