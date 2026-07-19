export const ASSET_BASE = '/kapa-auth'

/** Resolves a theme-relative path (e.g. "/wp-content/uploads/...") against
 * the site's asset base. Already-absolute URLs (e.g. real inspection photos
 * hosted on Unsplash) pass through untouched instead of getting the base
 * prefixed onto them, which would otherwise produce a broken URL. */
export function asset(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${ASSET_BASE}${path}`
}
