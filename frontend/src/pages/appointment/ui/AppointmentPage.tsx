import { useCallback, useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  pruneKapaNavbar,
  rewriteKapaRouteLinks,
  useClonedKapaPage,
  useMountKapaNavbarWidgets,
  type TransformTemplateDocument,
} from '../../../shared/lib/kapa-template'
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
    pruneKapaNavbar(doc, body)

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

  // Mount the booking form into the cloned template's slot ONCE per template
  // render. Deliberately excludes `user` from the deps: when the auth profile
  // resolves (or refreshes) the form must NOT be torn down and rebuilt — that
  // wipes whatever the visitor was in the middle of entering (picked date,
  // selected category). New user props are pushed to the existing root by the
  // effect below, which React reconciles while preserving the form's state.
  const rootRef = useRef<Root | null>(null)
  useEffect(() => {
    if (!pageSpec) return

    const slot = document.getElementById('appointment-booking-slot')
    if (!slot) return

    const root = createRoot(slot)
    rootRef.current = root
    root.render(<AppointmentBookingForm user={user} />)

    return () => {
      rootRef.current = null
      root.unmount()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, pageSpec])

  // Push updated user props into the already-mounted form without remounting.
  useEffect(() => {
    rootRef.current?.render(<AppointmentBookingForm user={user} />)
  }, [user])

  useMountKapaNavbarWidgets(Boolean(pageSpec))

  return <div className="appointment-root" dangerouslySetInnerHTML={{ __html: markup }} aria-busy={!pageSpec} />
}
