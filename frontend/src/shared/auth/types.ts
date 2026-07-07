export type AuthRole = 'onlineCustomer' | 'walkInCustomer' | 'serviceAdvisor' | 'technician' | 'accountant' | 'admin'

export type AuthUser = {
  _id?: string
  id?: string
  fullName?: string
  email?: string
  phone?: string
  role?: AuthRole | string
}
