import { apiRequest } from '../../../../shared/lib/api-client'

export type SystemConfig = {
  openHour: number
  lastSlotHour: number
  slotCapacity: number
  techShiftHours: number
  capacityEfficiency: number
  capacityReserveRatio: number
  defaultJobMinutes: number
}

export async function fetchSystemConfig(token: string): Promise<SystemConfig> {
  const response = await apiRequest<{ config: SystemConfig }>('/api/admin/config', { token })
  return response.config
}

export async function updateSystemConfig(token: string, payload: SystemConfig): Promise<SystemConfig> {
  const response = await apiRequest<{ config: SystemConfig }>('/api/admin/config', {
    method: 'PUT',
    token,
    body: JSON.stringify(payload),
  })
  return response.config
}
