import type { AuthRole } from './types'

const ROLE_HOME_BY_ROLE: Partial<Record<AuthRole, string>> = {
  onlineCustomer: '/customer/profile',
  admin: '/admin/dashboard',
  accountant: '/accountant/invoices',
  serviceAdvisor: '/advisor/dashboard',
  technician: '/technician/work-orders',
}

export function getPostLoginPath(role: AuthRole) {
  return ROLE_HOME_BY_ROLE[role] ?? null
}

export function isSupportedFrontendRole(role: AuthRole) {
  return role in ROLE_HOME_BY_ROLE
}

export function getRoleLabel(role: AuthRole) {
  const labels: Record<AuthRole, string> = {
    accountant: 'Accountant',
    admin: 'Administrator',
    onlineCustomer: 'Online customer',
    serviceAdvisor: 'Service advisor',
    technician: 'Technician',
    walkInCustomer: 'Walk-in customer',
  }

  return labels[role]
}
