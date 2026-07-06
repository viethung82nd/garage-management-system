import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../shared/auth'
import {
  CustomerAccountNav,
  CustomerEmptyState,
  CustomerPageLayout,
  CustomerPanel,
  CustomerSectionHeading,
} from '../../../../shared/ui/kapa-customer'
import { fetchCustomerRepairOrders, type CustomerRepairOrderApiRecord } from '../../api/customerApi'

function vehicleLabel(order: CustomerRepairOrderApiRecord) {
  const vehicle = order.vehicleId
  if (!vehicle) {
    return 'Vehicle'
  }
  return [vehicle.brand, vehicle.model, vehicle.licensePlate ? `(${vehicle.licensePlate})` : null].filter(Boolean).join(' ')
}

function formatCompletedDate(value?: string | null) {
  if (!value) {
    return 'Recently completed'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Recently completed'
  }
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export default function CustomerReviewsPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const repairOrders = await fetchCustomerRepairOrders(token)
        if (cancelled) return
        setOrders(repairOrders)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load your repair orders')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const completedOrders = useMemo(() => orders.filter((order) => order.status === 'completed'), [orders])

  return (
    <CustomerPageLayout title="Service Reviews" breadcrumb="Reviews">
      <div className="row">
        <div className="col-lg-3">
          <CustomerAccountNav />
        </div>
        <div className="col-lg-9">
          <CustomerSectionHeading
            eyebrow="Your feedback"
            title="Leave a review"
            description="Rate and comment on repair orders that have been completed."
          />

          {loading ? <CustomerPanel>Loading your completed repair orders...</CustomerPanel> : null}
          {error ? <CustomerPanel className="customer-panel--error">{error}</CustomerPanel> : null}

          {!loading && !error && completedOrders.length === 0 ? (
            <CustomerEmptyState
              title="No completed repair orders yet"
              description="Once a repair order is marked completed, it will show up here so you can leave a review."
            />
          ) : null}

          {completedOrders.map((order) => (
            <CustomerPanel key={order._id} className="customer-review-card">
              <h4>{vehicleLabel(order)}</h4>
              <p className="customer-review-card__meta">Completed {formatCompletedDate(order.completedAt)}</p>
            </CustomerPanel>
          ))}
        </div>
      </div>
    </CustomerPageLayout>
  )
}
