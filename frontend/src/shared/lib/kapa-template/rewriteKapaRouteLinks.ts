const APP_ROUTE_BY_PATHNAME = new Map<string, string>([
  ['/kapa/', '/'],
  ['/kapa/index.html', '/'],
  ['/kapa/home-five/', '/home-five'],
  ['/kapa/home-five/index.html', '/home-five'],
  ['/kapa/contact-us/', '/contact-us'],
  ['/kapa/contact-us/index.html', '/contact-us'],
  ['/kapa/appointment/', '/appointment'],
  ['/kapa/appointment/index.html', '/appointment'],
  ['/kapa/our-brands/', '/our-brands'],
  ['/kapa/our-brands/index.html', '/our-brands'],
  ['/kapa/my-account/', '/my-account'],
  ['/kapa/my-account/index.html', '/my-account'],
  ['/kapa/my-account/lost-password/', '/my-account/lost-password'],
  ['/kapa/my-account/lost-password/index.html', '/my-account/lost-password'],
  ['/contact-us/index.html', '/contact-us'],
  ['/appointment/index.html', '/appointment'],
  ['/our-brands/index.html', '/our-brands'],
  ['/home-five/index.html', '/home-five'],
  ['/my-account/index.html', '/my-account'],
  ['/my-account/lost-password/index.html', '/my-account/lost-password'],
])

function normalizePathname(pathname: string) {
  if (!pathname) return pathname
  return pathname.endsWith('/') ? pathname : pathname
}

// Matches envytheme.com and every subdomain (themes., docs., etc.) — the
// theme vendor's own site, scraped along with every page's markup.
const ENVYTHEME_HOSTNAME_RE = /(^|\.)envytheme\.com$/i

function resolveAppHref(rawHref: string, pageUrl: string) {
  if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
    return null
  }

  if (rawHref.startsWith('mailto:')) {
    // e.g. mailto:hello@envytheme.com — the theme demo's own support contact.
    return ENVYTHEME_HOSTNAME_RE.test(rawHref.slice('mailto:'.length).split('@')[1] || '') ? '#' : null
  }

  try {
    const resolved = new URL(rawHref, pageUrl)
    const pathname = normalizePathname(resolved.pathname)
    const mapped = APP_ROUTE_BY_PATHNAME.get(pathname)
    if (mapped) return mapped

    // Every other page this scraped markup links to (blog posts, shop/cart,
    // our-team, docs, etc.) was never built in this app — a real visitor
    // must never be sent off to the original theme vendor's live site.
    if (ENVYTHEME_HOSTNAME_RE.test(resolved.hostname)) return '#'
    return null
  } catch {
    return null
  }
}

export function rewriteKapaRouteLinks(body: HTMLBodyElement, pageUrl: string) {
  body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href')
    if (!href) return

    const appHref = resolveAppHref(href, pageUrl)
    if (appHref) {
      anchor.setAttribute('href', appHref)
    }
  })
}
