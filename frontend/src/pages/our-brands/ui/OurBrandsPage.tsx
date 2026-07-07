import { useCallback } from 'react'
import {
  pruneKapaNavbar,
  rewriteKapaRouteLinks,
  useClonedKapaPage,
  useMountKapaNavbarWidgets,
  type TransformTemplateDocument,
} from '../../../shared/lib/kapa-template'

const OUR_BRANDS_URL = '/kapa-auth/our-brands/index.html'
const OUR_BRANDS_BASE = '/kapa-auth/our-brands/'
const OUR_BRANDS_TITLE = 'Our Brands – Kapa'
const OUR_BRANDS_REMOTE_URL = 'https://themes.envytheme.com/kapa/our-brands/'

const OVERLAY_REVEAL_SELECTOR = '.page-banner-content h2, .section-title-wrap h2, .brand-area .section-title-wrap h2'

export default function OurBrandsPage() {
  const transformDocument = useCallback<TransformTemplateDocument>((doc, body) => {
    rewriteKapaRouteLinks(body, OUR_BRANDS_REMOTE_URL)
    pruneKapaNavbar(doc, body)
  }, [])

  const { markup, pageSpec } = useClonedKapaPage({
    htmlUrl: OUR_BRANDS_URL,
    baseHref: OUR_BRANDS_BASE,
    documentTitle: OUR_BRANDS_TITLE,
    overlaySelector: OVERLAY_REVEAL_SELECTOR,
    transformDocument,
    disableExistingLink: (href) => href.includes('/kapa-auth/') || href.includes('/external/'),
  })

  useMountKapaNavbarWidgets(Boolean(pageSpec))

  return <div className="our-brands-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
