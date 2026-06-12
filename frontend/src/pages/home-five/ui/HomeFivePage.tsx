import { useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useClonedKapaPage, type TransformTemplateDocument } from '../../../shared/lib/kapa-template'
import EstimateSection from '../../../widgets/home-five-estimate/ui/EstimateSection'

const HOME_FIVE_URL = '/kapa-auth/home-five/index.html'
const HOME_FIVE_BASE = '/kapa-auth/home-five/'
const HOME_FIVE_TITLE = 'Home Five – Kapa'
const HOME_FIVE_BODY_CLASS =
  'wp-singular page-template-default page page-id-988 wp-theme-kapa theme-kapa woocommerce-js elementor-default elementor-kit-5 elementor-page elementor-page-988 e--ua-blink e--ua-chrome e--ua-webkit'

const OVERLAY_REVEAL_SELECTOR =
  '.main-banner-content h1, .content h3, .choose-us-content h3, .section-content h2, .process-item h3, .section-title-wrap h2, .estimate-left-content h3, .who-we-are-content h3, .main-banner-wrap-content h1, .services-details-content h3'

export default function HomeFivePage() {
  const transformDocument = useCallback<TransformTemplateDocument>((doc, body) => {
    body.querySelectorAll('.estimate-left-content').forEach((element) => {
      const slot = doc.createElement('div')
      slot.id = 'home-five-estimate-slot'
      element.replaceWith(slot)
    })
  }, [])

  const { markup, pageSpec } = useClonedKapaPage({
    htmlUrl: HOME_FIVE_URL,
    baseHref: HOME_FIVE_BASE,
    documentTitle: HOME_FIVE_TITLE,
    defaultBodyClassName: HOME_FIVE_BODY_CLASS,
    overlaySelector: OVERLAY_REVEAL_SELECTOR,
    transformDocument,
    disableExistingLink: (href) => href.includes('/kapa-auth/'),
  })

  useEffect(() => {
    if (!pageSpec) return

    const slot = document.getElementById('home-five-estimate-slot')
    if (!slot) return

    const root = createRoot(slot)
    root.render(<EstimateSection />)

    return () => {
      root.unmount()
    }
  }, [markup, pageSpec])

  return <div className="home-five-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
