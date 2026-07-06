export type PartRecord = {
  _id: string
  name: string
  sku: string
  unitPrice: number
  stockQuantity: number
}

export type PartPayload = Omit<PartRecord, '_id'>

/**
 * No Part model or API exists on the backend yet. This holds parts in memory
 * for the session (resets on reload) so the CRUD UI can be built and used
 * now, then swapped for real requests once the backend ships.
 */
let mockParts: PartRecord[] = []

export async function fetchParts(): Promise<{ parts: PartRecord[] }> {
  return { parts: mockParts }
}

export async function createPart(payload: PartPayload): Promise<{ part: PartRecord }> {
  const part: PartRecord = { _id: `part-${Date.now()}`, ...payload }
  mockParts = [part, ...mockParts]
  return { part }
}

export async function updatePart(id: string, payload: PartPayload): Promise<{ part: PartRecord }> {
  mockParts = mockParts.map((part) => (part._id === id ? { ...part, ...payload } : part))
  const part = mockParts.find((item) => item._id === id)
  if (!part) {
    throw new Error('Part not found')
  }
  return { part }
}

export async function deletePart(id: string): Promise<{ message: string }> {
  mockParts = mockParts.filter((part) => part._id !== id)
  return { message: 'Part removed' }
}
