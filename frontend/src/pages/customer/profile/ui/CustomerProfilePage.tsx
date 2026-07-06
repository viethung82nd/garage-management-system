import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../../shared/auth'
import { asset } from '../../../../shared/lib/asset'
import {
  CustomerAccountNav,
  CustomerFormField,
  CustomerInfoCard,
  CustomerInput,
  CustomerMetricCard,
  CustomerPageLayout,
  CustomerPrimaryButton,
  CustomerSectionHeading,
} from '../../../../shared/ui/kapa-customer'
import {
  fetchCustomerBookings,
  fetchCustomerInvoices,
  fetchCustomerRepairOrders,
  type CustomerBookingApiRecord,
  type CustomerInvoiceApiRecord,
  type CustomerRepairOrderApiRecord,
} from '../../api/customerApi'

const GARAGE_NAME = 'Kapa Auto Care Center'
const PRIMARY_VEHICLE_IMAGE = '/wp-content/uploads/2022/11/choose.webp'
const EMAIL_RE = /^\S+@\S+\.\S+$/

function formatMemberSince(value?: string) {
  if (!value) {
    return 'Recently joined'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Recently joined'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatVisitDate(value?: string, timeSlot?: string) {
  if (!value) {
    return 'No appointment scheduled'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return timeSlot ? `${value} • ${timeSlot}` : value
  }

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)

  return timeSlot ? `${formattedDate} • ${timeSlot}` : formattedDate
}

function mapRepairStatus(status?: string) {
  switch (status) {
    case 'inProgress':
      return 'Repair in progress'
    case 'completed':
      return 'Ready for handover'
    case 'cancelled':
      return 'Cancelled'
    case 'pending':
      return 'Awaiting advisor intake'
    default:
      return 'Updating'
  }
}

function buildCustomerCode(userId?: string) {
  return userId ? `CUS-${userId.slice(-4).toUpperCase()}` : 'CUS-0000'
}

function pickPrimaryVehicle(
  repairOrders: CustomerRepairOrderApiRecord[],
  bookings: CustomerBookingApiRecord[],
) {
  const latestRepairVehicle = repairOrders.find((order) => order.vehicleId)?.vehicleId
  if (latestRepairVehicle) {
    return latestRepairVehicle
  }

  return bookings.find((booking) => booking.vehicleId)?.vehicleId || null
}

function findUpcomingBooking(bookings: CustomerBookingApiRecord[]) {
  const now = Date.now()

  return [...bookings]
    .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
    .map((booking) => ({
      booking,
      startsAt: new Date(`${booking.bookingDate}T${booking.timeSlot}:00`).getTime(),
    }))
    .filter((item) => !Number.isNaN(item.startsAt) && item.startsAt >= now)
    .sort((left, right) => left.startsAt - right.startsAt)[0]?.booking || null
}

function findActiveRepair(repairOrders: CustomerRepairOrderApiRecord[]) {
  return [...repairOrders]
    .filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
    .sort((left, right) => {
      const leftTime = new Date(left.startedAt || left.completedAt || 0).getTime()
      const rightTime = new Date(right.startedAt || right.completedAt || 0).getTime()
      return rightTime - leftTime
    })[0] || null
}

export default function CustomerProfilePage() {
  const { token, user } = useAuth()
  const [bookings, setBookings] = useState<CustomerBookingApiRecord[]>([])
  const [repairOrders, setRepairOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [invoices, setInvoices] = useState<CustomerInvoiceApiRecord[]>([])
  const [requestError, setRequestError] = useState('')
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', email: '' })
  const [profileFormError, setProfileFormError] = useState('')

  useEffect(() => {
    if (!user) return
    setProfileForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
    })
  }, [user])

  useEffect(() => {
    if (!token) {
      return
    }

    let cancelled = false

    const load = async () => {
      setRequestError('')

      try {
        const [bookingResponse, repairOrderResponse, invoiceResponse] = await Promise.all([
          fetchCustomerBookings(token),
          fetchCustomerRepairOrders(token),
          fetchCustomerInvoices(token),
        ])

        if (cancelled) {
          return
        }

        setBookings(bookingResponse.bookings)
        setRepairOrders(repairOrderResponse)
        setInvoices(invoiceResponse.invoices)
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : 'Unable to load your customer profile.')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [token])

  const profileView = useMemo(() => {
    const activeRepair = findActiveRepair(repairOrders)
    const upcomingBooking = findUpcomingBooking(bookings)
    const primaryVehicle = pickPrimaryVehicle(repairOrders, bookings)
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid').length

    return {
      name: user?.fullName || 'Customer',
      customerId: buildCustomerCode(user?._id),
      memberSince: formatMemberSince(user?.createdAt),
      phone: user?.phone || 'No phone on file',
      email: user?.email || 'No email on file',
      address: 'No address on file',
      garageName: GARAGE_NAME,
      loyaltyTier: 'Online customer',
      activeRepair: activeRepair ? `RO-${activeRepair._id.slice(-6).toUpperCase()}` : 'No active repair',
      nextAppointment: upcomingBooking ? formatVisitDate(upcomingBooking.bookingDate, upcomingBooking.timeSlot) : 'No appointment scheduled',
      activeStatus: activeRepair ? mapRepairStatus(activeRepair.status) : 'All current repairs completed',
      primaryVehicle: {
        label: 'Primary Vehicle',
        vehicle: [primaryVehicle?.brand, primaryVehicle?.model, primaryVehicle?.year].filter(Boolean).join(' ') || 'Vehicle updating',
        plate: primaryVehicle?.licensePlate || 'Not recorded',
        vin: primaryVehicle?.chassisNumber || primaryVehicle?.engineNumber || 'Not recorded',
        mileage: 'Not recorded',
        lastService:
          repairOrders[0]?.completedAt
            ? formatVisitDate(repairOrders[0].completedAt)
            : bookings[0]
              ? formatVisitDate(bookings[0].bookingDate, bookings[0].timeSlot)
              : 'No service recorded',
        image: PRIMARY_VEHICLE_IMAGE,
      },
      stats: [
        { label: 'Appointments', value: String(bookings.length).padStart(2, '0') },
        { label: 'Repair Orders', value: String(repairOrders.length).padStart(2, '0') },
        { label: 'Paid Invoices', value: String(paidInvoices).padStart(2, '0') },
        {
          label: 'Active Repair',
          value: String(repairOrders.filter((order) => order.status !== 'completed' && order.status !== 'cancelled').length).padStart(2, '0'),
        },
      ],
    }
  }, [bookings, invoices, repairOrders, user])

  return (
    <CustomerPageLayout title="Customer Profile" breadcrumb="Customer Profile">
      <section className="customer-section">
        <CustomerAccountNav />

        <div className="customer-panel customer-profile-hero-card">
          <div className="customer-profile-hero">
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <div className="customer-profile-avatar">{profileView.name.slice(0, 2).toUpperCase()}</div>
              <div className="customer-profile-hero__copy">
                <span className="customer-booking-card__eyebrow">Account Overview</span>
                <h3>{profileView.name}</h3>
                <div className="customer-profile-chips">
                  <span>{profileView.customerId}</span>
                  <span>Since {profileView.memberSince}</span>
                  <span>{profileView.loyaltyTier}</span>
                  <span>{profileView.garageName}</span>
                </div>
              </div>
            </div>

            <div className="customer-empty-actions">
              <Link to="/customer/bookings" className="default-btn customer-primary-btn">
                View Booking History
                <span />
              </Link>
              <Link to="/tracking" className="default-btn customer-primary-btn customer-primary-btn--ghost">
                Track Repair
                <span />
              </Link>
            </div>
          </div>
        </div>

        {requestError ? (
          <div className="customer-panel mt-4 text-sm" style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fff1f2' }}>
            {requestError}
          </div>
        ) : null}
      </section>

      <section className="customer-section">
        <div className="customer-metric-strip customer-metric-strip--four">
          {profileView.stats.map((item) => (
            <CustomerMetricCard key={item.label} label={item.label} value={item.value} accent={item.label === 'Active Repair'} />
          ))}
        </div>
      </section>

      <section className="customer-section">
        <div className="row g-4">
          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Contact" title="Your details">
              <form
                className="customer-profile-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  setProfileFormError('')

                  if (!profileForm.fullName.trim()) {
                    setProfileFormError('Full name is required')
                    return
                  }
                  if (!profileForm.email.trim() || !EMAIL_RE.test(profileForm.email.trim())) {
                    setProfileFormError('A valid email is required')
                    return
                  }
                }}
              >
                {profileFormError ? <p className="customer-profile-form__error">{profileFormError}</p> : null}
                <CustomerFormField id="profile-fullName" label="Full name" required>
                  <CustomerInput
                    id="profile-fullName"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-phone" label="Phone">
                  <CustomerInput
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-email" label="Email" required>
                  <CustomerInput
                    id="profile-email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </CustomerFormField>
                <CustomerPrimaryButton type="submit">Save changes</CustomerPrimaryButton>
              </form>
            </CustomerInfoCard>
          </div>

          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Current Activity" title="What needs attention">
              <div className="customer-profile-meta">
                <div>
                  <span className="customer-booking-card__label">Repair</span>
                  <strong>{profileView.activeRepair}</strong>
                  <p>{profileView.activeStatus}</p>
                </div>
                <div>
                  <span className="customer-booking-card__label">Next visit</span>
                  <strong>{profileView.nextAppointment}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Garage</span>
                  <strong>{profileView.garageName}</strong>
                </div>
              </div>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      <section className="customer-section">
        <CustomerSectionHeading eyebrow="Primary Vehicle" title="Your main vehicle" compact />

        <CustomerInfoCard eyebrow={profileView.primaryVehicle.label} title={profileView.primaryVehicle.vehicle} className="customer-vehicle-card">
          <div className="customer-vehicle-card__layout">
            <div className="customer-vehicle-card__media">
              <img src={asset(profileView.primaryVehicle.image)} alt={profileView.primaryVehicle.vehicle} />
            </div>

            <div className="customer-vehicle-card__grid">
              <div>
                <span className="customer-booking-card__label">License plate</span>
                <strong>{profileView.primaryVehicle.plate}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">Mileage</span>
                <strong>{profileView.primaryVehicle.mileage}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">Last service</span>
                <strong>{profileView.primaryVehicle.lastService}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">VIN</span>
                <strong>{profileView.primaryVehicle.vin}</strong>
              </div>
            </div>
          </div>
        </CustomerInfoCard>
      </section>
    </CustomerPageLayout>
  )
}
