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
  ['/contact-us/index.html', '/contact-us'],
  ['/appointment/index.html', '/appointment'],
  ['/our-brands/index.html', '/our-brands'],
  ['/home-five/index.html', '/home-five'],
])

function normalizePathname(pathname: string) {
  if (!pathname) return pathname
  return pathname.endsWith('/') ? pathname : pathname
}

function resolveAppHref(rawHref: string, pageUrl: string) {
  if (
    !rawHref ||
    rawHref.startsWith('#') ||
    rawHref.startsWith('mailto:') ||
    rawHref.startsWith('tel:') ||
    rawHref.startsWith('javascript:')
  ) {
    return null
  }

  try {
    const resolved = new URL(rawHref, pageUrl)
    const pathname = normalizePathname(resolved.pathname)
    return APP_ROUTE_BY_PATHNAME.get(pathname) ?? null
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
