import { useCallback } from 'react'
import {
  pruneKapaNavbar,
  rewriteKapaRouteLinks,
  useClonedKapaPage,
  useMountKapaNavbarWidgets,
  type TransformTemplateDocument,
} from '../../../shared/lib/kapa-template'

const CONTACT_US_URL = '/kapa-auth/contact-us/index.html'
const CONTACT_US_BASE = '/kapa-auth/contact-us/'
const CONTACT_US_TITLE = 'Contact Us – Kapa'
const CONTACT_US_REMOTE_URL = 'https://themes.envytheme.com/kapa/contact-us/'

const OVERLAY_REVEAL_SELECTOR =
  '.section-title-wrap h2, .contact-us-form .content h3, .page-banner-content h2, .partner-area .section-title-wrap h2'

export default function ContactUsPage() {
  const transformDocument = useCallback<TransformTemplateDocument>((doc, body) => {
    rewriteKapaRouteLinks(body, CONTACT_US_REMOTE_URL)
    pruneKapaNavbar(doc, body)
  }, [])

  const { markup, pageSpec } = useClonedKapaPage({
    htmlUrl: CONTACT_US_URL,
    baseHref: CONTACT_US_BASE,
    documentTitle: CONTACT_US_TITLE,
    overlaySelector: OVERLAY_REVEAL_SELECTOR,
    transformDocument,
    disableExistingLink: (href) => href.includes('/kapa-auth/') || href.includes('/external/'),
  })

  useMountKapaNavbarWidgets(Boolean(pageSpec))

  return <div className="contact-us-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
