import { useCallback } from 'react'
import { rewriteKapaRouteLinks, useClonedKapaPage, type TransformTemplateDocument } from '../../../shared/lib/kapa-template'

const APPOINTMENT_URL = '/kapa-auth/appointment/index.html'
const APPOINTMENT_BASE = '/kapa-auth/appointment/'
const APPOINTMENT_TITLE = 'Appointment – Kapa'
const APPOINTMENT_REMOTE_URL = 'https://themes.envytheme.com/kapa/appointment/'

const OVERLAY_REVEAL_SELECTOR = '.page-banner-content h2, .section-title-wrap h2, .appointment-form .content h3, .content h3'

export default function AppointmentPage() {
  const transformDocument = useCallback<TransformTemplateDocument>((_doc, body) => {
    rewriteKapaRouteLinks(body, APPOINTMENT_REMOTE_URL)
  }, [])

  const { markup, pageSpec } = useClonedKapaPage({
    htmlUrl: APPOINTMENT_URL,
    baseHref: APPOINTMENT_BASE,
    documentTitle: APPOINTMENT_TITLE,
    overlaySelector: OVERLAY_REVEAL_SELECTOR,
    transformDocument,
    disableExistingLink: (href) => href.includes('/kapa-auth/') || href.includes('/external/'),
  })

  return <div className="appointment-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
