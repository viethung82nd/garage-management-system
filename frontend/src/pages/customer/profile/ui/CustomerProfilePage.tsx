import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  deleteCustomerAccount,
  fetchCustomerBookings,
  fetchCustomerInvoices,
  fetchCustomerRepairOrders,
  fetchCustomerVehicles,
  updateCustomerProfile,
  type CustomerBookingApiRecord,
  type CustomerInvoiceApiRecord,
  type CustomerRepairOrderApiRecord,
  type CustomerVehicleRecord,
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

function vehicleLabel(vehicle: CustomerVehicleRecord) {
  return [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ') || 'Vehicle'
}

function formatMileage(km?: number | null) {
  return km != null ? `${new Intl.NumberFormat('vi-VN').format(km)} km` : 'Not recorded'
}

function scrollVehicles(dir: 'left' | 'right', ref: React.RefObject<HTMLDivElement | null>) {
  ref.current?.scrollBy({ left: dir === 'left' ? -340 : 340, behavior: 'smooth' })
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

  return (
    [...bookings]
      .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
      .map((booking) => ({
        booking,
        startsAt: new Date(`${booking.bookingDate}T${booking.timeSlot}:00`).getTime(),
      }))
      .filter((item) => !Number.isNaN(item.startsAt) && item.startsAt >= now)
      .sort((left, right) => left.startsAt - right.startsAt)[0]?.booking || null
  )
}

function findActiveRepair(repairOrders: CustomerRepairOrderApiRecord[]) {
  return (
    [...repairOrders]
      .filter((order) => order.status !== 'completed' && order.status !== 'cancelled')
      .sort((left, right) => {
        const leftTime = new Date(left.startedAt || left.completedAt || 0).getTime()
        const rightTime = new Date(right.startedAt || right.completedAt || 0).getTime()
        return rightTime - leftTime
      })[0] || null
  )
}

export default function CustomerProfilePage() {
  const { token, user, refreshProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<CustomerBookingApiRecord[]>([])
  const [repairOrders, setRepairOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [invoices, setInvoices] = useState<CustomerInvoiceApiRecord[]>([])
  const [vehicles, setVehicles] = useState<CustomerVehicleRecord[]>([])
  const vehiclesScrollRef = useRef<HTMLDivElement>(null)
  const primaryVehicle = pickPrimaryVehicle(repairOrders, bookings)
  const [requestError, setRequestError] = useState('')
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
  })
  const [profileFormError, setProfileFormError] = useState('')
  const [profileFormSaving, setProfileFormSaving] = useState(false)
  const [profileFormSaved, setProfileFormSaved] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordFormError, setPasswordFormError] = useState('')
  const [passwordFormSaving, setPasswordFormSaving] = useState(false)
  const [passwordFormSaved, setPasswordFormSaved] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!user) return
    setProfileForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
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
        const [bookingResponse, repairOrderResponse, invoiceResponse, vehicleResponse] = await Promise.all([
          fetchCustomerBookings(token),
          fetchCustomerRepairOrders(token),
          fetchCustomerInvoices(token),
          fetchCustomerVehicles(token).catch(() => ({ vehicles: [] as CustomerVehicleRecord[] })),
        ])

        if (cancelled) {
          return
        }

        setBookings(bookingResponse.bookings)
        setRepairOrders(repairOrderResponse)
        setInvoices(invoiceResponse.invoices)
        setVehicles(vehicleResponse.vehicles)
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error ? error.message : 'Unable to load your customer profile.',
          )
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
      activeRepair: activeRepair
        ? `RO-${activeRepair._id.slice(-6).toUpperCase()}`
        : 'No active repair',
      nextAppointment: upcomingBooking
        ? formatVisitDate(upcomingBooking.bookingDate, upcomingBooking.timeSlot)
        : 'No appointment scheduled',
      activeStatus: activeRepair
        ? mapRepairStatus(activeRepair.status)
        : 'All current repairs completed',
      primaryVehicle: {
        label: 'Primary Vehicle',
        vehicle: [primaryVehicle?.brand, primaryVehicle?.model, primaryVehicle?.year].filter(Boolean).join(' ') || 'Vehicle updating',
        plate: primaryVehicle?.licensePlate || 'Not recorded',
        vin: primaryVehicle?.chassisNumber || primaryVehicle?.engineNumber || 'Not recorded',
        mileage:
          primaryVehicle?.lastKnownMileage != null
            ? `${new Intl.NumberFormat('vi-VN').format(primaryVehicle.lastKnownMileage)} km`
            : 'Not recorded',
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
          value: String(
            repairOrders.filter(
              (order) => order.status !== 'completed' && order.status !== 'cancelled',
            ).length,
          ).padStart(2, '0'),
        },
      ],
    }
  }, [bookings, invoices, repairOrders, user])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileFormError('')
    setProfileFormSaved(false)

    if (!profileForm.fullName.trim()) {
      setProfileFormError('Full name is required')
      return
    }
    if (!profileForm.email.trim() || !EMAIL_RE.test(profileForm.email.trim())) {
      setProfileFormError('A valid email is required')
      return
    }
    if (!token) return

    setProfileFormSaving(true)
    try {
      await updateCustomerProfile(token, {
        fullName: profileForm.fullName.trim(),
        phone: profileForm.phone.trim() || undefined,
        email: profileForm.email.trim(),
        dateOfBirth: profileForm.dateOfBirth || undefined,
      })
      await refreshProfile()
      setProfileFormSaved(true)
    } catch (error) {
      setProfileFormError(
        error instanceof Error ? error.message : 'Unable to update your profile. Please try again.',
      )
    } finally {
      setProfileFormSaving(false)
    }
  }

  function updateProfileField(field: keyof typeof profileForm, value: string) {
    setProfileForm((current) => ({ ...current, [field]: value }))
    setProfileFormError('')
    setProfileFormSaved(false)
  }

  function updatePasswordField(field: keyof typeof passwordForm, value: string) {
    setPasswordForm((current) => ({ ...current, [field]: value }))
    setPasswordFormError('')
    setPasswordFormSaved(false)
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordFormError('')
    setPasswordFormSaved(false)

    if (!passwordForm.currentPassword) {
      setPasswordFormError('Enter your current password.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordFormError('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFormError('New password and confirmation do not match.')
      return
    }
    if (!token) return

    setPasswordFormSaving(true)
    try {
      await updateCustomerProfile(token, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordFormSaved(true)
    } catch (error) {
      setPasswordFormError(
        error instanceof Error
          ? error.message
          : 'Unable to change your password. Please try again.',
      )
    } finally {
      setPasswordFormSaving(false)
    }
  }

  function openDeleteModal() {
    setDeleteError('')
    setDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    setDeleteError('')
    setDeleteModalOpen(false)
  }

  async function handleDeleteAccount() {
    if (!token) return
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteCustomerAccount(token)
      logout()
      navigate('/my-account', { replace: true })
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Unable to delete your account. Please try again.',
      )
      setDeleting(false)
    }
  }

  return (
    <CustomerPageLayout title="Customer Profile" breadcrumb="Customer Profile">
      <section className="customer-section">
        <CustomerAccountNav />

        <div className="customer-panel customer-profile-hero-card">
          <div className="customer-profile-hero">
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <div className="customer-profile-avatar">
                {profileView.name.slice(0, 2).toUpperCase()}
              </div>
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
              <Link
                to="/tracking"
                className="default-btn customer-primary-btn customer-primary-btn--ghost"
              >
                Track Repair
                <span />
              </Link>
            </div>
          </div>
        </div>

        {requestError ? (
          <div
            className="customer-panel mt-4 text-sm"
            style={{ color: '#991b1b', border: '1px solid #fecaca', background: '#fff1f2' }}
          >
            {requestError}
          </div>
        ) : null}
      </section>

      <section className="customer-section">
        <div className="customer-metric-strip customer-metric-strip--four">
          {profileView.stats.map((item) => (
            <CustomerMetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              accent={item.label === 'Active Repair'}
            />
          ))}
        </div>
      </section>

      <section className="customer-section">
        <div className="row g-4">
          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Contact" title="Your details">
              <form className="customer-profile-form" onSubmit={handleProfileSubmit}>
                {profileFormError ? (
                  <p className="customer-profile-form__error">{profileFormError}</p>
                ) : null}
                {profileFormSaved ? (
                  <p className="customer-profile-form__success">Profile updated.</p>
                ) : null}
                <CustomerFormField id="profile-fullName" label="Full name" required>
                  <CustomerInput
                    id="profile-fullName"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={(event) => updateProfileField('fullName', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-phone" label="Phone">
                  <CustomerInput
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(event) => updateProfileField('phone', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-email" label="Email" required>
                  <CustomerInput
                    id="profile-email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => updateProfileField('email', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-dateOfBirth" label="Date of birth">
                  <CustomerInput
                    id="profile-dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={profileForm.dateOfBirth}
                    onChange={(event) => updateProfileField('dateOfBirth', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerPrimaryButton type="submit" disabled={profileFormSaving}>
                  {profileFormSaving ? 'Saving...' : 'Save changes'}
                </CustomerPrimaryButton>
              </form>
            </CustomerInfoCard>
          </div>

          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Security" title="Change password">
              <form className="customer-profile-form" onSubmit={handlePasswordSubmit}>
                {passwordFormError ? (
                  <p className="customer-profile-form__error">{passwordFormError}</p>
                ) : null}
                {passwordFormSaved ? (
                  <p className="customer-profile-form__success">Password changed.</p>
                ) : null}
                <CustomerFormField id="profile-currentPassword" label="Current password" required>
                  <CustomerInput
                    id="profile-currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => updatePasswordField('currentPassword', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerFormField id="profile-newPassword" label="New password" required>
                  <CustomerInput
                    id="profile-newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(event) => updatePasswordField('newPassword', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerFormField
                  id="profile-confirmPassword"
                  label="Confirm new password"
                  required
                >
                  <CustomerInput
                    id="profile-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) => updatePasswordField('confirmPassword', event.target.value)}
                  />
                </CustomerFormField>
                <CustomerPrimaryButton type="submit" disabled={passwordFormSaving}>
                  {passwordFormSaving ? 'Changing...' : 'Change password'}
                </CustomerPrimaryButton>
              </form>

              <div className="customer-profile-danger-zone">
                <span className="customer-booking-card__label">Danger zone</span>
                <p>Deleting your account is permanent and cannot be undone.</p>
                <button
                  type="button"
                  className="customer-primary-btn customer-primary-btn--ghost"
                  onClick={() => openDeleteModal()}
                >
                  Delete account
                </button>
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

      <section className="customer-section">
        <CustomerSectionHeading
          eyebrow="Vehicle Collection"
          title="Your vehicles"
          compact
          centered
        />

        {vehicles.length === 0 ? (
          <CustomerInfoCard title="No vehicles registered">
            <p style={{ color: 'var(--color-muted)', fontSize: 14, margin: 0 }}>
              You haven't registered any vehicles yet. Book an appointment and we'll add your car to your profile.
            </p>
          </CustomerInfoCard>
        ) : vehicles.length > 3 ? (
          <div className="customer-vehicles customer-vehicles--carousel">
            <button
              aria-label="Scroll left"
              className="customer-vehicles__arrow customer-vehicles__arrow--left"
              onClick={() => scrollVehicles('left', vehiclesScrollRef)}
              type="button"
            >
              ‹
            </button>

            <div className="customer-vehicles__track" ref={vehiclesScrollRef}>
              {vehicles.map((vehicle) => {
                const lastRo = repairOrders.find((ro) => {
                  const vid = typeof ro.vehicleId === 'object' ? (ro.vehicleId as { _id: string })._id : null
                  return vid === vehicle._id
                })
                const lastService = lastRo?.completedAt
                  ? formatVisitDate(lastRo.completedAt)
                  : 'No service recorded'

                return (
                  <div className="customer-vehicle-card" key={vehicle._id}>
                    <div className="customer-vehicle-card__media">
                      {vehicle.photo ? (
                        <img
                          alt={vehicleLabel(vehicle)}
                          src={asset(vehicle.photo)}
                        />
                      ) : (
                        <div className="customer-vehicle-card__placeholder">
                          <svg fill="none" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 16H10M10 16H6M10 16V12M14 16L18 16M10 16L6 16M14 16L18 12M14 16L18 20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                          </svg>
                          <span>No photo</span>
                        </div>
                      )}
                    </div>

                    <div className="customer-vehicle-card__body">
                      <strong className="customer-vehicle-card__plate">{vehicle.licensePlate}</strong>
                      <span className="customer-vehicle-card__model">{vehicleLabel(vehicle)}</span>

                      <div className="customer-vehicle-card__stats">
                        <div>
                          <span className="customer-booking-card__label">Mileage</span>
                          <strong>{formatMileage(vehicle.lastKnownMileage)}</strong>
                        </div>
                        <div>
                          <span className="customer-booking-card__label">Last service</span>
                          <strong>{lastService}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              aria-label="Scroll right"
              className="customer-vehicles__arrow customer-vehicles__arrow--right"
              onClick={() => scrollVehicles('right', vehiclesScrollRef)}
              type="button"
            >
              ›
            </button>
          </div>
        ) : (
          <div className="customer-vehicles customer-vehicles--grid">
            {vehicles.map((vehicle) => {
              const lastRo = repairOrders.find((ro) => {
                const vid = typeof ro.vehicleId === 'object' ? (ro.vehicleId as { _id: string })._id : null
                return vid === vehicle._id
              })
              const lastService = lastRo?.completedAt
                ? formatVisitDate(lastRo.completedAt)
                : 'No service recorded'

              return (
                <div className="customer-vehicle-card" key={vehicle._id}>
                  <div className="customer-vehicle-card__media">
                    {vehicle.photo ? (
                      <img
                        alt={vehicleLabel(vehicle)}
                        src={asset(vehicle.photo)}
                      />
                    ) : (
                      <div className="customer-vehicle-card__placeholder">
                        <svg fill="none" height="40" viewBox="0 0 24 24" width="40" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14 16H10M10 16H6M10 16V12M14 16L18 16M10 16L6 16M14 16L18 12M14 16L18 20" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5"/>
                        </svg>
                        <span>No photo</span>
                      </div>
                    )}
                  </div>

                  <div className="customer-vehicle-card__body">
                    <strong className="customer-vehicle-card__plate">{vehicle.licensePlate}</strong>
                    <span className="customer-vehicle-card__model">{vehicleLabel(vehicle)}</span>

                    <div className="customer-vehicle-card__stats">
                      <div>
                        <span className="customer-booking-card__label">Mileage</span>
                        <strong>{formatMileage(vehicle.lastKnownMileage)}</strong>
                      </div>
                      <div>
                        <span className="customer-booking-card__label">Last service</span>
                        <strong>{lastService}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {deleteModalOpen ? (
        <div
          className="customer-modal-backdrop"
          role="presentation"
          onClick={() => closeDeleteModal()}
        >
          <div
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="customer-modal__close"
              aria-label="Close"
              onClick={() => closeDeleteModal()}
            >
              ×
            </button>
            <div className="customer-modal__content">
              <h3 id="delete-account-title">Delete your account?</h3>
              <p>This will permanently delete your account and cannot be undone.</p>
              {deleteError ? <p className="customer-profile-form__error">{deleteError}</p> : null}
              <div className="customer-modal__actions">
                <button
                  type="button"
                  className="customer-primary-btn customer-primary-btn--ghost"
                  disabled={deleting}
                  onClick={() => closeDeleteModal()}
                >
                  Cancel
                </button>
                <CustomerPrimaryButton
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                >
                  {deleting ? 'Deleting...' : 'Delete my account'}
                </CustomerPrimaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </CustomerPageLayout>
  )
}
