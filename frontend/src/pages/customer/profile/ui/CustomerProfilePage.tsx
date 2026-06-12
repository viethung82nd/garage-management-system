import { Link } from 'react-router-dom'
import {
  CustomerAccountNav,
  CustomerInfoCard,
  CustomerPageLayout,
  CustomerSectionHeading,
} from '../../../../shared/ui/kapa-customer'
import { customerProfile } from '../../model/mock'

export default function CustomerProfilePage() {
  return (
    <CustomerPageLayout title="Customer Profile" breadcrumb="Customer Profile">
      <section className="customer-section">
        <CustomerAccountNav />

        <div className="customer-panel customer-profile-hero-card">
          <div className="customer-profile-hero">
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <div className="customer-profile-avatar">{customerProfile.name.slice(0, 2).toUpperCase()}</div>
              <div className="customer-profile-hero__copy">
                <span className="customer-booking-card__eyebrow">Account Overview</span>
                <h3>{customerProfile.name}</h3>
                <p>
                  {customerProfile.customerId} • Member since {customerProfile.memberSince} • {customerProfile.loyaltyTier}
                </p>
              </div>
            </div>

            <div className="customer-empty-actions">
              <Link to="/customer/bookings" className="default-btn customer-primary-btn">
                View Booking History
                <span />
              </Link>
              <Link to="/customer/tracking" className="default-btn customer-primary-btn customer-primary-btn--ghost">
                Track Repair
                <span />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="customer-section">
        <div className="customer-stats-strip">
          {customerProfile.stats.map((item) => (
            <div key={item.label} className="customer-stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="customer-section">
        <div className="row g-4">
          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Contact Details" title="Your profile information">
              <div className="customer-profile-meta">
                <div>
                  <span className="customer-booking-card__label">Phone</span>
                  <strong>{customerProfile.phone}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Email</span>
                  <strong>{customerProfile.email}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Address</span>
                  <strong>{customerProfile.address}</strong>
                </div>
              </div>
            </CustomerInfoCard>
          </div>

          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Service Snapshot" title="What is active on your account">
              <div className="customer-profile-meta">
                <div>
                  <span className="customer-booking-card__label">Active repair</span>
                  <strong>{customerProfile.activeRepair}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Next appointment</span>
                  <strong>{customerProfile.nextAppointment}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Tier</span>
                  <strong>{customerProfile.loyaltyTier}</strong>
                </div>
              </div>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      <section className="customer-section">
        <CustomerSectionHeading
          eyebrow="Primary Vehicle"
          title="Vehicle details tied to your latest Kapa visits"
          description="This quick summary helps you review the car we are currently servicing and the maintenance history attached to your profile."
        />

        <CustomerInfoCard eyebrow={customerProfile.primaryVehicle.label} title={customerProfile.primaryVehicle.vehicle} className="customer-vehicle-card">
          <div className="customer-vehicle-card__grid">
            <div>
              <span className="customer-booking-card__label">License plate</span>
              <strong>{customerProfile.primaryVehicle.plate}</strong>
            </div>
            <div>
              <span className="customer-booking-card__label">VIN</span>
              <strong>{customerProfile.primaryVehicle.vin}</strong>
            </div>
            <div>
              <span className="customer-booking-card__label">Mileage</span>
              <strong>{customerProfile.primaryVehicle.mileage}</strong>
            </div>
            <div>
              <span className="customer-booking-card__label">Last service</span>
              <strong>{customerProfile.primaryVehicle.lastService}</strong>
            </div>
          </div>
        </CustomerInfoCard>
      </section>
    </CustomerPageLayout>
  )
}
