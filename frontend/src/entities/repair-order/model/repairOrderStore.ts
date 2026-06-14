import type { RepairOrder } from './types'

const repairOrdersCache = new Map<string, RepairOrder>()

export function cacheRepairOrders(repairOrders: RepairOrder[]) {
  repairOrders.forEach((repairOrder) => {
    repairOrdersCache.set(repairOrder.id, repairOrder)
  })
}

export function getCachedRepairOrder(id: string) {
  return repairOrdersCache.get(id)
}

export function clearRepairOrderCache() {
  repairOrdersCache.clear()
}
