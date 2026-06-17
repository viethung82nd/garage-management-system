import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CustomerEmptyState,
  CustomerFormField,
  CustomerInfoCard,
  CustomerInput,
  CustomerMetricCard,
  CustomerPageLayout,
  CustomerPrimaryButton,
  CustomerSectionHeading,
  CustomerStatusBadge,
  CustomerTimeline,
} from '../../../../shared/ui/kapa-customer'
import type { TrackingRecord } from '../../model/mock'
import { fetchTrackingRecord, TrackingApiError, type TrackingApiResponse } from '../api/trackingApi'

function formatVehicle(vehicle: TrackingApiResponse['vehicle']) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.licensePlate
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Updating'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(date)
    .replace(',', ' •')
}

function mapTrackingRecord(record: TrackingApiResponse): TrackingRecord {
  return {
    plate: record.vehicle.licensePlate,
    phone: record.customer?.phone || '',
    bookingId: record.displayRepairOrderId,
    customerName: record.customer?.fullName || 'Customer',
    customerId: record.customer ? `CUS-${record.customer.phone.slice(-4)}` : 'CUS-0000',
    vehicle: formatVehicle(record.vehicle),
    intakeType: record.intakeType === 'Walk-in' ? 'Walk-in' : 'Appointment',
    garageName: record.garageName,
    currentStatus: record.statusLabel,
    currentStatusTone: record.statusTone,
    estimatedCompletion:
      record.status === 'completed'
        ? 'Completed'
        : formatDateTime(record.completedAt || record.invoice.issuedAt) === 'Updating'
          ? 'Updating'
          : formatDateTime(record.completedAt || record.invoice.issuedAt),
    paymentStatus: record.payment.status,
    paymentTone: record.payment.tone,
    serviceAdvisor: record.serviceAdvisor,
    technician: record.technician,
    approvedServices: record.approvedServices,
    invoiceId: record.invoice.displayId,
    quotedTotal: formatCurrency(record.invoice.total || record.totalCost || 0),
    paymentMethod: record.payment.method,
    timeline: record.timeline.map((step) => ({
      ...step,
      timestamp: formatDateTime(step.timestamp),
    })),
    stageLabel: record.stageLabel,
    stageValue: record.stageValue,
    progressPercent: record.progressPercent,
  }
}

export default function CustomerTrackingPage() {
  const [plate, setPlate] = useState('51H-12345')
  const [phone, setPhone] = useState('0901234567')
  const [result, setResult] = useState<TrackingRecord | false | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestError, setRequestError] = useState('')

  return (
    <CustomerPageLayout title="Repair Status Tracking" breadcrumb="Repair Status Tracking">
      <section className="customer-section customer-section--tracking">
        <div className="row align-items-start g-4">
          <div className="col-lg-6">
            <CustomerSectionHeading
              eyebrow="Track Your Repair"
              title="Check repair progress fast"
              description="Check online booking or walk-in repair."
              compact
            />

            <div className="customer-metric-strip customer-metric-strip--three">
                  <CustomerMetricCard label="Input" value="2 fields" note="Plate + phone" />
                  <CustomerMetricCard label="Covers" value="Walk-in / online" note="One repair flow" />
                  <CustomerMetricCard label="Focus" value="ETA" note="See ready time fast" accent />
                </div>
          </div>

          <div className="col-lg-6">
            <CustomerInfoCard eyebrow="Lookup" title="Find your order" className="customer-tracking-form-card">
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  setIsSubmitting(true)
                  setRequestError('')
                  setResult(null)

                  try {
                    const response = await fetchTrackingRecord(plate.trim(), phone.trim())
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
              <CustomerInfoCard eyebrow="Current Status" title={result.currentStatus}>
                <div className="customer-metric-strip customer-metric-strip--stack">
                  <CustomerMetricCard label="ETA" value={result.estimatedCompletion} accent />
                  <CustomerMetricCard label={result.stageLabel} value={result.stageValue} note={result.progressPercent} />
                </div>
                <div className="customer-meta-list">
                  <div>
                    <span>Booking ID</span>
                    <strong>{result.bookingId}</strong>
                  </div>
                  <div>
                    <span>Vehicle</span>
                    <strong>{result.vehicle}</strong>
                  </div>
                  <div>
                    <span>Order type</span>
                    <strong>{result.intakeType}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <CustomerStatusBadge tone={result.currentStatusTone}>{result.currentStatus}</CustomerStatusBadge>
                  </div>
                </div>
              </CustomerInfoCard>
            </div>

            <div className="col-xl-4">
              <CustomerInfoCard eyebrow="Service Snapshot" title="Who is handling your car">
                <div className="customer-meta-list">
                  <div>
                    <span>Garage</span>
                    <strong>{result.garageName}</strong>
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
                    <span>Payment</span>
                    <CustomerStatusBadge tone={result.paymentTone}>{result.paymentStatus}</CustomerStatusBadge>
                  </div>
                  <div>
                    <span>Invoice</span>
                    <strong>{result.invoiceId}</strong>
                  </div>
                  <div>
                    <span>Quoted total</span>
                    <strong>{result.quotedTotal}</strong>
                  </div>
                  <div>
                    <span>Payment method</span>
                    <strong>{result.paymentMethod}</strong>
                  </div>
                </div>

                <div className="customer-service-tags">
                  {result.approvedServices.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>

                {result.additionalProposal ? (
                  <div className="customer-inline-note">
                    <span className="customer-booking-card__label">Additional proposal</span>
                    <p>{result.additionalProposal}</p>
                  </div>
                ) : null}
              </CustomerInfoCard>
            </div>

            <div className="col-xl-4">
              <CustomerInfoCard eyebrow="Progress" title="Repair steps">
                <CustomerTimeline steps={result.timeline} />
              </CustomerInfoCard>
            </div>
          </div>
        </section>
      ) : null}
    </CustomerPageLayout>
  )
}
