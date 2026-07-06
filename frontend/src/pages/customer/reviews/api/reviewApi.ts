import { apiRequest } from '../../../../shared/lib/api-client'

export type CustomerReviewApiRecord = {
  _id: string
  repairOrderId: string
  rating: number
  comment?: string
  createdAt?: string
}

export type SubmitServiceReviewPayload = {
  repairOrderId: string
  rating: number
  comment?: string
}

export function fetchMyReviews(token: string) {
  return apiRequest<{ reviews: CustomerReviewApiRecord[] }>('/api/reviews/mine', {
    method: 'GET',
    token,
  })
}

export function submitServiceReview(token: string, payload: SubmitServiceReviewPayload) {
  return apiRequest<{ review: CustomerReviewApiRecord }>('/api/reviews', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}
