import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CustomerEmptyState,
  CustomerFormField,
  CustomerInfoCard,
  CustomerInput,
  CustomerPageLayout,
  CustomerPrimaryButton,
  CustomerSectionHeading,
  CustomerStatusBadge,
  CustomerTimeline,
} from '../../../../shared/ui/kapa-customer'
import { trackingRecords } from '../../model/mock'

function normalize(value: string) {
  return value.replace(/\s+/g, '').toLowerCase()
}

export default function CustomerTrackingPage() {
  const [plate, setPlate] = useState('51H-12345')
  const [phone, setPhone] = useState('0901234567')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const result = useMemo<false | null | (typeof trackingRecords)[number]>(() => {
    if (!hasSubmitted) return null

    return (
      trackingRecords.find((record) => normalize(record.plate) === normalize(plate) && normalize(record.phone) === normalize(phone)) ?? false
    )
  }, [hasSubmitted, phone, plate])

  return (
    <CustomerPageLayout title="Repair Status Tracking" breadcrumb="Repair Status Tracking">
      <section className="customer-section customer-section--tracking">
        <div className="row align-items-start g-4">
          <div className="col-lg-6">
            <CustomerSectionHeading
              eyebrow="Track Your Repair"
              title="Follow every milestone of your vehicle service in one place"
              description="Use your license plate and phone number to check the latest repair progress, assigned technician, approved services, and pickup readiness."
            />

            <div className="customer-highlight-list">
              <div className="customer-highlight-list__item">
                <strong>Walk-in friendly</strong>
                <p>Designed for both account holders and direct service customers.</p>
              </div>
              <div className="customer-highlight-list__item">
                <strong>Live repair milestones</strong>
                <p>See intake, diagnosis, repair, and handover updates without calling the garage.</p>
              </div>
              <div className="customer-highlight-list__item">
                <strong>Kapa service visibility</strong>
                <p>Review assigned staff, approved work items, and expected completion time clearly.</p>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <CustomerInfoCard eyebrow="Lookup Form" title="Get your latest repair update" className="customer-tracking-form-card">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  setHasSubmitted(true)
                }}
                className="customer-tracking-form"
              >
                <CustomerFormField id="tracking-plate" label="License Plate" required hint="Example: 51H-12345">
                  <CustomerInput
                    id="tracking-plate"
                    name="tracking-plate"
                    placeholder="License Plate*"
                    value={plate}
                    onChange={(event) => setPlate(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerFormField id="tracking-phone" label="Phone Number" required hint="Use the number provided during check-in or booking.">
                  <CustomerInput
                    id="tracking-phone"
                    name="tracking-phone"
                    placeholder="Phone Number*"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </CustomerFormField>

                <CustomerPrimaryButton type="submit">Track Repair Status</CustomerPrimaryButton>
              </form>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      {result === false ? (
        <section className="customer-section">
          <CustomerEmptyState
            title="We could not find a repair order with those details"
            description="Please recheck your license plate and phone number, or contact our service team if your vehicle was checked in recently."
            action={
              <div className="customer-empty-actions">
                <Link to="/contact-us" className="default-btn customer-primary-btn">
                  Contact Service Team
                  <span />
                </Link>
                <Link to="/my-account" className="default-btn customer-primary-btn customer-primary-btn--ghost">
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
          <div className="row g-4">
            <div className="col-xl-4">
              <CustomerInfoCard eyebrow="Repair Summary" title="Current order snapshot">
                <div className="customer-meta-list">
                  <div>
                    <span>Booking ID</span>
                    <strong>{result.bookingId}</strong>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{result.customerName}</strong>
                  </div>
                  <div>
                    <span>Vehicle</span>
                    <strong>{result.vehicle}</strong>
                  </div>
                  <div>
                    <span>Current status</span>
                    <CustomerStatusBadge tone={result.currentStatusTone}>{result.currentStatus}</CustomerStatusBadge>
                  </div>
                  <div>
                    <span>Estimated completion</span>
                    <strong>{result.estimatedCompletion}</strong>
                  </div>
                </div>
              </CustomerInfoCard>
            </div>

            <div className="col-xl-4">
              <CustomerInfoCard eyebrow="Service Details" title="Assigned team and approved work">
                <div className="customer-meta-list">
                  <div>
                    <span>Branch</span>
                    <strong>{result.branch}</strong>
                  </div>
                  <div>
                    <span>Service advisor</span>
                    <strong>{result.serviceAdvisor}</strong>
                  </div>
                  <div>
                    <span>Technician</span>
                    <strong>{result.technician}</strong>
                  </div>
                  <div>
                    <span>Payment status</span>
                    <CustomerStatusBadge tone={result.paymentTone}>{result.paymentStatus}</CustomerStatusBadge>
                  </div>
                </div>

                <div className="customer-service-tags">
                  {result.selectedServices.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
              </CustomerInfoCard>
            </div>

            <div className="col-xl-4">
              <CustomerInfoCard eyebrow="Repair Timeline" title="Live progress milestones">
                <CustomerTimeline steps={result.timeline} />
              </CustomerInfoCard>
            </div>
          </div>
        </section>
      ) : null}
    </CustomerPageLayout>
  )
}
