import { describe, expect, it } from 'vitest'
import { asset } from '../lib/asset'

/**
 * Minimal smoke test for the frontend test runner (Q5 quality infra).
 * Exercises a small, dependency-light pure helper — no backend, no network,
 * no Kapa theme scripts involved — just to confirm Vitest + TS are wired up
 * and green.
 */
describe('asset (smoke)', () => {
  it('prefixes a theme-relative path with the asset base', () => {
    expect(asset('/wp-content/uploads/logo.png')).toBe('/kapa-auth/wp-content/uploads/logo.png')
  })

  it('passes already-absolute http(s) URLs through untouched', () => {
    const url = 'https://images.unsplash.com/photo-123'
    expect(asset(url)).toBe(url)
  })
})
