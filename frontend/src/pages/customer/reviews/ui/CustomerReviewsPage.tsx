import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../../../shared/auth'
import {
  CustomerAccountNav,
  CustomerEmptyState,
  CustomerPageLayout,
  CustomerPanel,
  CustomerPrimaryButton,
  CustomerSectionHeading,
  CustomerTextarea,
} from '../../../../shared/ui/kapa-customer'
import { fetchCustomerRepairOrders, type CustomerRepairOrderApiRecord } from '../../api/customerApi'
import { fetchMyReviews, submitServiceReview, type CustomerReviewApiRecord } from '../api/reviewApi'
import { CustomerRatingInput } from './CustomerRatingInput'

function vehicleLabel(order: CustomerRepairOrderApiRecord) {
  const vehicle = order.vehicleId
  if (!vehicle) {
    return 'Vehicle'
  }
  return [vehicle.brand, vehicle.model, vehicle.licensePlate ? `(${vehicle.licensePlate})` : null]
    .filter(Boolean)
    .join(' ')
}

function formatCompletedDate(value?: string | null) {
  if (!value) {
    return 'Recently completed'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Recently completed'
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function ReviewFormCard({
  order,
  token,
  existingReview,
}: {
  order: CustomerRepairOrderApiRecord
  token: string
  existingReview?: CustomerReviewApiRecord
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await submitServiceReview(token, {
        repairOrderId: order._id,
        rating,
        comment: comment.trim() || undefined,
      })
      setSubmitted(true)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to submit your review. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyReviewed = Boolean(existingReview)

  return (
    <CustomerPanel key={order._id} className="customer-review-card">
      <h4>{vehicleLabel(order)}</h4>
      <p className="customer-review-card__meta">
        Completed {formatCompletedDate(order.completedAt)}
      </p>

      {alreadyReviewed && existingReview ? (
        <div className="customer-review-card__existing">
          <CustomerRatingInput value={existingReview.rating} onChange={() => {}} disabled />
          {existingReview.comment ? <p>{existingReview.comment}</p> : null}
        </div>
      ) : submitted ? (
        <p className="customer-review-card__thanks">Thanks for your feedback!</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error ? <p className="customer-review-card__error">{error}</p> : null}
          <CustomerRatingInput value={rating} onChange={setRating} disabled={submitting} />
          <CustomerTextarea
            rows={3}
            placeholder="How was your experience with this repair?"
            value={comment}
            disabled={submitting}
            onChange={(event) => setComment(event.target.value)}
          />
          <CustomerPrimaryButton type="submit" disabled={rating === 0 || submitting}>
            {submitting ? 'Submitting...' : 'Submit review'}
          </CustomerPrimaryButton>
        </form>
      )}
    </CustomerPanel>
  )
}

export default function CustomerReviewsPage() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<CustomerRepairOrderApiRecord[]>([])
  const [reviews, setReviews] = useState<CustomerReviewApiRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [repairOrders, reviewsResponse] = await Promise.all([
          fetchCustomerRepairOrders(token),
          fetchMyReviews(token),
        ])
        if (cancelled) return
        setOrders(repairOrders)
        setReviews(reviewsResponse.reviews)
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load your repair orders',
          )
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

  const reviewableOrders = useMemo(
    () => orders.filter((order) => ['completed', 'readyForDelivery', 'delivered'].includes(order.status)),
    [orders],
  )
  const reviewsByOrderId = useMemo(
    () => new Map(reviews.map((review) => [review.repairOrderId, review])),
    [reviews],
  )

  return (
    <CustomerPageLayout title="Service Reviews" breadcrumb="Reviews">
      <section className="customer-section">
        <CustomerAccountNav />
        <CustomerSectionHeading
          eyebrow="Your feedback"
          title="Leave a review"
          description=""
          compact
          centered
        />

        {loading ? <CustomerPanel>Loading your completed repair orders...</CustomerPanel> : null}
        {error ? <CustomerPanel className="customer-panel--error">{error}</CustomerPanel> : null}

        {!loading && !error && reviewableOrders.length === 0 ? (
          <CustomerEmptyState
            title="No completed repair orders yet"
            description="Once a repair order is completed and delivered, it will show up here so you can leave a review."
          />
        ) : null}

        {token
          ? reviewableOrders.map((order) => (
              <ReviewFormCard
                key={order._id}
                order={order}
                token={token}
                existingReview={reviewsByOrderId.get(order._id)}
              />
            ))
          : null}
      </section>
    </CustomerPageLayout>
  )
}
