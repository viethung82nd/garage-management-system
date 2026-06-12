import { useMemo, useState } from 'react'
import {
  CustomerAccountNav,
  CustomerBookingCard,
  CustomerEmptyState,
  CustomerFormField,
  CustomerInput,
  CustomerPageLayout,
  CustomerPanel,
  CustomerSectionHeading,
  CustomerSelect,
} from '../../../../shared/ui/kapa-customer'
import { bookingHistory } from '../../model/mock'

export default function CustomerBookingsPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return bookingHistory.filter((booking) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        booking.id.toLowerCase().includes(normalizedQuery) ||
        booking.vehicle.toLowerCase().includes(normalizedQuery) ||
        booking.plate.toLowerCase().includes(normalizedQuery)

      const matchesStatus = status === 'all' || booking.statusTone === status

      return matchesQuery && matchesStatus
    })
  }, [query, status])

  return (
    <CustomerPageLayout title="Booking History" breadcrumb="Booking History">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading
          eyebrow="Your Service Records"
          title="Review past bookings and check the latest order progress"
          description="Filter by status or search by booking ID and vehicle to quickly find the service visit you need."
        />

        <div className="customer-toolbar">
          <CustomerPanel>
            <CustomerFormField id="booking-search" label="Search Booking">
              <CustomerInput
                id="booking-search"
                name="booking-search"
                placeholder="Search by booking ID, vehicle, or license plate"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </CustomerFormField>
          </CustomerPanel>

          <CustomerPanel>
            <CustomerFormField id="booking-status" label="Filter Status">
              <CustomerSelect id="booking-status" name="booking-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="ready">Ready for pickup</option>
                <option value="in-progress">In progress</option>
                <option value="pending">Pending / waiting</option>
              </CustomerSelect>
            </CustomerFormField>
          </CustomerPanel>
        </div>
      </section>

      <section className="customer-section">
        {filteredBookings.length === 0 ? (
          <CustomerEmptyState
            title="No booking matches your current filters"
            description="Try a different booking ID, vehicle keyword, or reset the status filter to see your full Kapa service history."
          />
        ) : (
          <div className="customer-bookings-list d-grid gap-4">
            {filteredBookings.map((booking) => (
              <CustomerBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </section>
    </CustomerPageLayout>
  )
}
