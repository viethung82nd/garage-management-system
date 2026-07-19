import type { TrackingRecord } from '../../model/mock'
import type { TrackingApiResponse } from '../api/trackingApi'

function formatVehicle(vehicle: TrackingApiResponse['vehicle']) {
  return [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.licensePlate
}

function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`
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

/** Shared mapper from the tracking API's raw shape to the UI-facing
 * `TrackingRecord` shape — used by both the public Track Repair page and the
 * authenticated Booking History "view detail" action, so both surfaces show
 * the exact same status/timeline/photos instead of two divergent copies. */
export function mapTrackingRecord(record: TrackingApiResponse): TrackingRecord {
  return {
    plate: record.vehicle.licensePlate,
    phone: record.customer?.phone || '',
    bookingId: record.displayRepairOrderId,
    customerName: record.customer?.fullName || 'Customer',
    customerId: record.customer ? `CUS-${record.customer.phone.slice(-4)}` : 'CUS-0000',
    vehicle: formatVehicle(record.vehicle),
    intakeType: record.intakeType === 'Walk-in' ? 'Walk-in' : 'Appointment',
    photos: record.photos || [],
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
