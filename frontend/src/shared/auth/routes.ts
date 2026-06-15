import type { AuthRole } from './types'

const ROLE_HOME_BY_ROLE: Partial<Record<AuthRole, string>> = {
  onlineCustomer: '/customer/profile',
  admin: '/admin/dashboard',
  accountant: '/accountant/invoices',
}

export function getPostLoginPath(role: AuthRole) {
  return ROLE_HOME_BY_ROLE[role] ?? null
}

export function isSupportedFrontendRole(role: AuthRole) {
  return role in ROLE_HOME_BY_ROLE
}

export function getRoleLabel(role: AuthRole) {
  switch (role) {
    case 'onlineCustomer':
      return 'Customer'
    case 'walkInCustomer':
      return 'Walk-in customer'
    case 'serviceAdvisor':
      return 'Service advisor'
    case 'technician':
      return 'Technician'
    case 'accountant':
      return 'Accountant'
    case 'admin':
      return 'Admin'
    default:
      return role
  }
}
