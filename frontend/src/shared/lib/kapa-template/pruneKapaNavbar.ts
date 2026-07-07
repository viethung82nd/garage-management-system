/** Top-level nav labels from the original theme that don't point anywhere real in this app. */
const DEAD_TOP_LEVEL_LABELS = ['Pages', 'Shop', 'Blog', 'Projects']

/** Class used to mark the spot where <KapaAccountCta /> should be mounted after render. */
export const ACCOUNT_CTA_MOUNT_CLASS = 'kapa-account-cta-mount'

/** Id of the <ul> left behind for the Services dropdown, populated live from the category API. */
export const SERVICES_DROPDOWN_SLOT_ID = 'kapa-services-dropdown-slot'

function directChildLink(li: Element) {
  return li.querySelector(':scope > a')
}

/**
 * Strips the dead template nav items (Pages/Shop/Blog/Projects, the fake cart
 * icon) out of a cloned Kapa theme page's navbar, simplifies "Home" from a
 * dropdown into a plain link, and leaves behind a couple of slots — one for
 * the live services dropdown, one for the auth-aware CTA button/logout — that
 * get mounted with real React content after the page renders. Run this inside
 * a page's `transformDocument` callback, on the raw cloned `body`.
 */
export function pruneKapaNavbar(doc: Document, body: HTMLElement) {
  body.querySelectorAll('#menu-navbar-left-menu > li.nav-item, #menu-navbar-right-menu > li.nav-item').forEach((li) => {
    const label = directChildLink(li)?.textContent?.trim()

    if (label === 'Home') {
      li.classList.remove('dropdown', 'menu-item-has-children')
      li.querySelector(':scope > .dropdown-menu')?.remove()
      const link = directChildLink(li)
      if (link) {
        link.setAttribute('href', '/')
        link.removeAttribute('data-toggle')
        link.removeAttribute('aria-haspopup')
        link.classList.remove('dropdown-toggle')
      }
      return
    }

    if (label === 'Services') {
      const link = directChildLink(li)
      link?.setAttribute('href', '/services')
      const dropdown = li.querySelector(':scope > .dropdown-menu')
      if (dropdown) {
        dropdown.id = SERVICES_DROPDOWN_SLOT_ID
        dropdown.innerHTML = '<li class="nav-item"><a class="dropdown-item" href="/services">All services</a></li>'
      }
      return
    }

    if (label && DEAD_TOP_LEVEL_LABELS.includes(label)) {
      li.remove()
    }
  })

  body.querySelectorAll('.cart-btn').forEach((cartBtn) => {
    cartBtn.closest('.option-item')?.remove()
  })

  body.querySelectorAll('.others-options .default-btn').forEach((cta) => {
    const mount = doc.createElement('div')
    mount.className = ACCOUNT_CTA_MOUNT_CLASS
    cta.replaceWith(mount)
  })
}
