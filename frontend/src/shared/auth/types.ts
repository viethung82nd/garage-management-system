export type AuthRole = 'onlineCustomer' | 'walkInCustomer' | 'serviceAdvisor' | 'technician' | 'accountant' | 'admin'

export type AuthUser = {
  _id: string
  fullName: string
  email?: string
  phone?: string
  role: AuthRole
  accountType: 'registered' | 'walkIn'
  isActive: boolean
  createdAt?: string
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export type AuthSession = {
  token: string
  user: AuthUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  fullName: string
  email: string
  phone?: string
  password: string
}

export type ForgotPasswordPayload = {
  email: string
}

export type ResetPasswordPayload = {
  email: string
  otp: string
  newPassword: string
}
