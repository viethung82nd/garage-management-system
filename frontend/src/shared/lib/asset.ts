export const ASSET_BASE = '/kapa-auth'

export function asset(path: string) {
  return `${ASSET_BASE}${path}`
}
