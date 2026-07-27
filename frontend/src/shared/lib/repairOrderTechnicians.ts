import type { AuthUser } from '../auth'
import { personName, type ApiRepairOrder } from '../api/workshop'

/** Distinct technicians assigned across a repair order's service lines, in first-seen order. */
export function getAssignedTechnicians(order?: ApiRepairOrder | null): AuthUser[] {
  const seen = new Map<string, AuthUser>()
  for (const service of order?.services || []) {
    const tech = service.technicianId
    if (tech && typeof tech === 'object') {
      const id = tech._id || tech.id
      if (id && !seen.has(id)) seen.set(id, tech)
    }
  }
  return [...seen.values()]
}

/** "Unassigned" | "Name" | "Name +2 more" — a compact label for a possibly multi-technician order. */
export function formatTechnicianLabel(order?: ApiRepairOrder | null, fallback = 'Unassigned') {
  const technicians = getAssignedTechnicians(order)
  if (technicians.length === 0) return fallback
  const first = personName(technicians[0], fallback)
  return technicians.length > 1 ? `${first} +${technicians.length - 1} more` : first
}
