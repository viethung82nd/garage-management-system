export const designTokens = {
  color: {
    surface: '#101415',
    surfaceContainerLowest: '#0b0f10',
    surfaceContainerLow: '#191c1e',
    surfaceContainer: '#1d2022',
    surfaceContainerHigh: '#272a2c',
    surfaceContainerHighest: '#323537',
    onSurface: '#e0e3e5',
    onSurfaceVariant: '#b9cbbd',
    outline: '#849588',
    outlineVariant: '#3a4a3f',
    primaryContainer: '#00ffa3',
    onPrimaryContainer: '#007146',
    secondaryContainer: '#3c4661',
    error: '#ffb4ab',
  },
  radius: {
    sm: '0.5rem',
    default: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
    full: '9999px',
  },
  spacing: {
    base: '8px',
    gutter: '24px',
    marginMobile: '16px',
    marginDesktop: '64px',
    containerMax: '1280px',
  },
} as const

export const sidebarItems = [
  { label: 'Đặt lịch chờ duyệt', path: '/advisor/bookings', icon: 'calendar' },
  { label: 'Tiếp nhận xe', path: '/advisor/reception', icon: 'car' },
  { label: 'Lệnh sửa chữa', path: '/advisor/work-orders', icon: 'wrench' },
  { label: 'Khách hàng', path: '/advisor/customers', icon: 'users' },
  { label: 'Phương tiện', path: '/advisor/vehicles', icon: 'grid' },
  { label: 'Việc kỹ thuật', path: '/technician/tasks', icon: 'team' },
  { label: 'Hóa đơn', path: '/accountant/invoices', icon: 'invoice' },
] as const

export const topNavItems = [
  { label: 'Cố vấn dịch vụ', path: '/advisor/bookings' },
  { label: 'Khách hàng', path: '/customer/dashboard' },
  { label: 'Kỹ thuật viên', path: '/technician/tasks' },
  { label: 'Kế toán', path: '/accountant/dashboard' },
  { label: 'Quản trị viên', path: '/admin/dashboard' },
] as const
