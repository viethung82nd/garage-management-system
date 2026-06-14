import { Link } from 'react-router-dom'
import { asset } from '../../../../shared/lib/asset'
import {
  CustomerAccountNav,
  CustomerInfoCard,
  CustomerMetricCard,
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
                <div className="customer-profile-chips">
                  <span>{customerProfile.customerId}</span>
                  <span>Since {customerProfile.memberSince}</span>
                  <span>{customerProfile.loyaltyTier}</span>
                  <span>{customerProfile.garageName}</span>
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
      </section>

      <section className="customer-section">
        <div className="customer-metric-strip customer-metric-strip--four">
          {customerProfile.stats.map((item) => (
            <CustomerMetricCard key={item.label} label={item.label} value={item.value} accent={item.label === 'Active'} />
          ))}
        </div>
      </section>

      <section className="customer-section">
        <div className="row g-4">
          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Contact" title="Your details">
              <div className="customer-profile-meta">
                <div>
                  <span className="customer-booking-card__label">Phone</span>
                  <strong>{customerProfile.phone}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Email</span>
                  <strong className="customer-text-break">{customerProfile.email}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Address</span>
                  <strong>{customerProfile.address}</strong>
                </div>
              </div>
            </CustomerInfoCard>
          </div>

          <div className="col-xl-6">
            <CustomerInfoCard eyebrow="Current Activity" title="What needs attention">
              <div className="customer-profile-meta">
                <div>
                  <span className="customer-booking-card__label">Repair</span>
                  <strong>{customerProfile.activeRepair}</strong>
                  <p>{customerProfile.activeStatus}</p>
                </div>
                <div>
                  <span className="customer-booking-card__label">Next visit</span>
                  <strong>{customerProfile.nextAppointment}</strong>
                </div>
                <div>
                  <span className="customer-booking-card__label">Garage</span>
                  <strong>{customerProfile.garageName}</strong>
                </div>
              </div>
            </CustomerInfoCard>
          </div>
        </div>
      </section>

      <section className="customer-section">
        <CustomerSectionHeading
          eyebrow="Primary Vehicle"
          title="Your main vehicle"
          compact
        />

        <CustomerInfoCard eyebrow={customerProfile.primaryVehicle.label} title={customerProfile.primaryVehicle.vehicle} className="customer-vehicle-card">
          <div className="customer-vehicle-card__layout">
            <div className="customer-vehicle-card__media">
              <img src={asset(customerProfile.primaryVehicle.image)} alt={customerProfile.primaryVehicle.vehicle} />
            </div>

            <div className="customer-vehicle-card__grid">
              <div>
                <span className="customer-booking-card__label">License plate</span>
                <strong>{customerProfile.primaryVehicle.plate}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">Mileage</span>
                <strong>{customerProfile.primaryVehicle.mileage}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">Last service</span>
                <strong>{customerProfile.primaryVehicle.lastService}</strong>
              </div>
              <div>
                <span className="customer-booking-card__label">VIN</span>
                <strong>{customerProfile.primaryVehicle.vin}</strong>
              </div>
            </div>
          </div>
        </CustomerInfoCard>
      </section>
    </CustomerPageLayout>
  )
}
