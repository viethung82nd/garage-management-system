import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CustomerEmptyState,
  CustomerFormField,
  CustomerInfoCard,
  CustomerInput,
  CustomerPageLayout,
  CustomerPrimaryButton,
  CustomerRepairStatusPanel,
  CustomerSectionHeading,
} from '../../../../shared/ui/kapa-customer'
import { useAuth } from '../../../../shared/auth'
import { fetchCustomerRepairOrders } from '../../api/customerApi'
import type { TrackingRecord } from '../../model/mock'
import { fetchTrackingRecord, TrackingApiError } from '../api/trackingApi'
import { mapTrackingRecord } from '../lib/mapTrackingRecord'

// A repair order still moving through the shop, as opposed to one already
// wrapped up — only these are worth auto-filling the lookup form for.
const INACTIVE_STATUSES = ['completed', 'cancelled']

export default function CustomerTrackingPage() {
  const { token, user } = useAuth()
  const [plate, setPlate] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<TrackingRecord | false | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')

  // Signed-in customer with a repair still in progress — fill in the lookup
  // for them instead of making them retype the plate/phone they already
  // gave at reception. Only ever fills in, never auto-submits, and never
  // overwrites anything the visitor has already typed themselves.
  useEffect(() => {
    if (!token) return
    let cancelled = false

    async function prefillFromActiveOrder() {
      try {
        const orders = await fetchCustomerRepairOrders(token!)
        if (cancelled) return
        const active = orders.find((order) => !INACTIVE_STATUSES.includes(order.status))
        if (!active) return

        setPlate((current) => current || active.vehicleId?.licensePlate || '')
        setPhone((current) => current || user?.phone || '')
      } catch {
        // Non-critical convenience prefill — leave the form blank on failure.
      }
    }

    void prefillFromActiveOrder()
    return () => {
      cancelled = true
    }
  }, [token, user?.phone])

  return (
    <CustomerPageLayout title="Repair Status Tracking" breadcrumb="Repair Status Tracking">
      <section className="customer-section customer-section--tracking">
        <div className="row justify-content-center">
          <div className="col-lg-8 col-xl-7">
            <div className="text-center customer-tracking-heading">
              <CustomerSectionHeading
                eyebrow="Track Your Repair"
                title="Check repair progress fast"
                compact
                centered
              />
            </div>

            <CustomerInfoCard
              eyebrow="Lookup"
              title="Find your order"
              className="customer-tracking-form-card"
            >
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  setIsSubmitting(true)
                  setRequestError('')
                  setResult(null)

                  try {
                    const response = await fetchTrackingRecord({
                      plate: plate.trim(),
                      phone: phone.trim(),
                    })
                    setResult(mapTrackingRecord(response))
                  } catch (error) {
                    if (error instanceof TrackingApiError && error.status === 404) {
                      setResult(false)
                    } else {
                      setRequestError(
                        error instanceof TrackingApiError
                          ? error.message
                          : 'Unable to load tracking information right now.',
                      )
                    }
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                className="customer-tracking-form"
              >
                <CustomerFormField id="tracking-plate" label="License Plate" required>
                  <CustomerInput
                    id="tracking-plate"
                    name="tracking-plate"
                    placeholder="License Plate*"
                    value={plate}
                    onChange={(event) => setPlate(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerFormField id="tracking-phone" label="Phone Number" required>
                  <CustomerInput
                    id="tracking-phone"
                    name="tracking-phone"
                    placeholder="Phone Number*"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerPrimaryButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Checking Status...' : 'Track Repair Status'}
                </CustomerPrimaryButton>

                {requestError ? <p className="customer-form-field__hint">{requestError}</p> : null}
              </form>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      {result === false ? (
        <section className="customer-section">
          <CustomerEmptyState
            title="No repair order found"
            description="Check plate and phone number, or contact Kapa."
            action={
              <div className="customer-empty-actions">
                <Link to="/contact-us" className="default-btn customer-primary-btn">
                  Contact Service Team
                  <span />
                </Link>
                <Link
                  to="/my-account"
                  className="default-btn customer-primary-btn customer-primary-btn--ghost"
                >
                  Go to Login
                  <span />
                </Link>
              </div>
            }
          />
        </section>
      ) : null}

      {result ? (
        <section className="customer-section customer-section--results">
          <CustomerRepairStatusPanel result={result} />
        </section>
      ) : null}
    </CustomerPageLayout>
  )
}
