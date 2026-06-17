import { useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { rewriteKapaRouteLinks, useClonedKapaPage, type TransformTemplateDocument } from '../../../shared/lib/kapa-template'
import { useAuth } from '../../../shared/auth'
import { AppointmentBookingForm } from '../../../widgets/appointment-booking'

const APPOINTMENT_URL = '/kapa-auth/appointment/index.html'
const APPOINTMENT_BASE = '/kapa-auth/appointment/'
const APPOINTMENT_TITLE = 'Appointment – Kapa'
const APPOINTMENT_REMOTE_URL = 'https://themes.envytheme.com/kapa/appointment/'

const OVERLAY_REVEAL_SELECTOR = '.page-banner-content h2, .section-title-wrap h2, .appointment-form .content h3, .content h3'

export default function AppointmentPage() {
  const { user } = useAuth()
  const transformDocument = useCallback<TransformTemplateDocument>((doc, body) => {
    rewriteKapaRouteLinks(body, APPOINTMENT_REMOTE_URL)

    body.querySelectorAll('.estimate-form .wpcf7.js').forEach((element) => {
      const slot = doc.createElement('div')
      slot.id = 'appointment-booking-slot'
      element.replaceWith(slot)
    })
  }, [])

  const { markup, pageSpec } = useClonedKapaPage({
    htmlUrl: APPOINTMENT_URL,
    baseHref: APPOINTMENT_BASE,
    documentTitle: APPOINTMENT_TITLE,
    overlaySelector: OVERLAY_REVEAL_SELECTOR,
    transformDocument,
    disableExistingLink: (href) => href.includes('/kapa-auth/') || href.includes('/external/'),
  })

  useEffect(() => {
    if (!pageSpec) return

    const slot = document.getElementById('appointment-booking-slot')
    if (!slot) return

    const root = createRoot(slot)
    root.render(<AppointmentBookingForm user={user} />)

    return () => {
      root.unmount()
    }
  }, [markup, pageSpec, user])

  return <div className="appointment-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
