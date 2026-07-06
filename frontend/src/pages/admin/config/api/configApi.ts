export type SystemConfig = {
  openHour: number
  lastSlotHour: number
  slotCapacity: number
}

/**
 * The backend has no config API — slot hours/capacity are hardcoded
 * constants in backend/src/config/slots.js. This mock mirrors those
 * defaults in memory so the settings form has something real to load and
 * save, ready to be swapped for a real GET/PUT /api/admin/config later.
 */
let mockConfig: SystemConfig = {
  openHour: 8,
  lastSlotHour: 16,
  slotCapacity: 5,
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  return mockConfig
}

export async function updateSystemConfig(payload: SystemConfig): Promise<SystemConfig> {
  mockConfig = payload
  return mockConfig
}
