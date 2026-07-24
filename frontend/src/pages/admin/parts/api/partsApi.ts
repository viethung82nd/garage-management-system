import { apiRequest } from '../../../../shared/lib/api-client'

export type PartRecord = {
  _id: string
  name: string
  sku: string
  unitPrice: number
  costPrice?: number
  stockQuantity: number
  /** Committed to approved repair orders but not yet handed out. */
  reservedQuantity?: number
  /** stockQuantity - reservedQuantity; what can still be sold. */
  availableQuantity?: number
  reorderPoint?: number
  isActive?: boolean
}

/** Creating a part sets its opening stock. */
export type CreatePartPayload = {
  name: string
  sku: string
  unitPrice: number
  costPrice?: number
  stockQuantity: number
  reorderPoint?: number
}

/**
 * Editing a part deliberately cannot change stockQuantity. On-hand stock is
 * the balance of a ledger, not a free-form field — corrections go through
 * adjustPartStock, which records a reason. Sending it here would be silently
 * ignored by the API.
 */
export type UpdatePartPayload = Omit<CreatePartPayload, 'stockQuantity'>

export function fetchParts(token: string, query?: string) {
  const search = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  return apiRequest<{ parts: PartRecord[] }>(`/api/admin/parts${search}`, {
    method: 'GET',
    token,
  })
}

export function createPart(token: string, payload: CreatePartPayload) {
  return apiRequest<{ part: PartRecord }>('/api/admin/parts', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export function updatePart(token: string, id: string, payload: UpdatePartPayload) {
  return apiRequest<{ part: PartRecord }>(`/api/admin/parts/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
}

/** Corrects on-hand stock after a physical count, or writes it off. The reason
 *  is mandatory and lands in the audit log. */
export function adjustPartStock(
  token: string,
  id: string,
  payload: { newQuantity: number; reason: string },
) {
  return apiRequest<{ part: PartRecord }>(`/api/admin/parts/${id}/adjust`, {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

/** Retires a part. The record is kept — historical documents reference it. */
export function deletePart(token: string, id: string) {
  return apiRequest<{ message: string }>(`/api/admin/parts/${id}`, {
    method: 'DELETE',
    token,
  })
}
