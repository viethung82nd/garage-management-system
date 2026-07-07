import { apiRequest } from '../../../shared/lib/api-client'

export type PublicServiceCategory = {
  _id: string
  name: string
  description?: string
  isActive: boolean
}

export type PublicService = {
  _id: string
  name: string
  category?: string
  basePrice: number
  estimatedDuration?: number
  isActive: boolean
}

export function fetchPublicServiceCategories() {
  return apiRequest<PublicServiceCategory[]>('/api/services/categories', { method: 'GET' })
}

export function fetchPublicServices() {
  return apiRequest<PublicService[]>('/api/services', { method: 'GET' })
}
