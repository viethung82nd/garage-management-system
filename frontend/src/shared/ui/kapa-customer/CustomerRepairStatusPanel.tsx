import { useState } from 'react'
import { asset } from '../../lib/asset'
import { CustomerInfoCard } from './CustomerInfoCard'
import { CustomerMetricCard } from './CustomerMetricCard'
import { CustomerStatusBadge } from './CustomerStatusBadge'
import { CustomerTimeline, type CustomerTimelineStep } from './CustomerTimeline'

type StatusTone = 'completed' | 'in-progress' | 'pending' | 'ready'

export type CustomerRepairStatus = {
  bookingId: string
  vehicle: string
  intakeType: string
  currentStatus: string
  currentStatusTone: StatusTone
  estimatedCompletion: string
  stageLabel: string
  stageValue: string
  progressPercent: string
  garageName: string
  serviceAdvisor: string
  technician: string
  paymentStatus: string
  paymentTone: StatusTone
  invoiceId: string
  quotedTotal: string
  paymentMethod: string
  approvedServices: string[]
  additionalProposal?: string
  timeline: CustomerTimelineStep[]
  /** Real photos taken during inspection/repair, if any were recorded — never decorative stock images. */
  photos: string[]
}

/** Main + thumbnail gallery for real inspection/repair photos. Renders
 * nothing when there are none, rather than falling back to a placeholder
 * image that could be mistaken for a real one. */
function RepairPhotoGallery({ photos, vehicle }: { photos: string[]; vehicle: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  if (photos.length === 0) {
    return null
  }

  const activeIndex = Math.min(selectedIndex, photos.length - 1)

  return (
    <CustomerInfoCard eyebrow="On-Site Photos" title="Photos from this repair">
      <div className="customer-modal__media customer-modal__media--inline">
        <div className="customer-modal__media-main">
          <img src={asset(photos[activeIndex])} alt={`${vehicle} — photo ${activeIndex + 1}`} />
        </div>
        {photos.length > 1 ? (
          <div className="customer-modal__thumbs">
            {photos.map((photo, index) => (
              <button
                key={photo}
                type="button"
                className={`customer-modal__thumb${activeIndex === index ? ' customer-modal__thumb--active' : ''}`}
                onClick={() => setSelectedIndex(index)}
              >
                <img src={asset(photo)} alt={`${vehicle} — thumbnail ${index + 1}`} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </CustomerInfoCard>
  )
}

/**
 * The "current status / who's handling your car / progress timeline / photos"
 * view shared by the public Track Repair page and the authenticated Booking
 * History detail — one implementation instead of two divergent copies.
 */
export function CustomerRepairStatusPanel({ result }: { result: CustomerRepairStatus }) {
  return (
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

      <div className="col-12">
        <RepairPhotoGallery photos={result.photos} vehicle={result.vehicle} />
      </div>
    </div>
  )
}
