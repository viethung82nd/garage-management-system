import { apiRequest } from '../../../../shared/lib/api-client'

export type PartRecord = {
  _id: string
  name: string
  sku: string
  unitPrice: number
  stockQuantity: number
}

export type PartPayload = Omit<PartRecord, '_id'>

export function fetchParts(token: string, query?: string) {
  const search = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return apiRequest<{ parts: PartRecord[] }>(`/api/admin/parts${search}`, {
    method: 'GET',
    token,
  })
}

export function createPart(token: string, payload: PartPayload) {
  return apiRequest<{ part: PartRecord }>('/api/admin/parts', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function updatePart(token: string, id: string, payload: PartPayload) {
  return apiRequest<{ part: PartRecord }>(`/api/admin/parts/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

export function deletePart(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/admin/parts/${id}`, {
    method: 'DELETE',
    token,
  })
}
