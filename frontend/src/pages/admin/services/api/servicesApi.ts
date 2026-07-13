import { apiRequest } from '../../../../shared/lib/api-client'

export type ServiceCategoryRecord = {
  _id: string
  name: string
  description?: string
  isActive: boolean
  imageUrl?: string
}

export type ServiceRecord = {
  _id: string
  name: string
  category?: string
  basePrice: number
  estimatedDuration?: number
  isActive: boolean
}

export type ServiceCategoryPayload = {
  name: string
  description?: string
  isActive?: boolean
}

export type ServicePayload = {
  name: string
  category?: string
  basePrice: number
  estimatedDuration?: number
  isActive?: boolean
}

export function fetchServiceCategories(token: string) {
  return apiRequest<ServiceCategoryRecord[]>('/api/services/categories', { method: 'GET', token })
}

export function createServiceCategory(token: string, payload: ServiceCategoryPayload) {
  return apiRequest<ServiceCategoryRecord>('/api/services/categories', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function deleteServiceCategory(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/services/categories/${id}`, { method: 'DELETE', token })
}

export function uploadServiceCategoryPhoto(token: string, id: string, file: File) {
  const formData = new FormData()
  formData.append('photo', file)
  return apiRequest<ServiceCategoryRecord>(`/api/services/categories/${id}/photo`, {
    method: 'POST',
    token,
    body: formData,
  })
}

export function fetchServices(token: string) {
  return apiRequest<ServiceRecord[]>('/api/services', { method: 'GET', token })
}

export function createService(token: string, payload: ServicePayload) {
  return apiRequest<ServiceRecord>('/api/services', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function updateService(token: string, id: string, payload: ServicePayload) {
  return apiRequest<ServiceRecord>(`/api/services/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export function deleteService(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/services/${id}`, { method: 'DELETE', token })
}
