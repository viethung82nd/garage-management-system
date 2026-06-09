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
  { label: 'Overview', path: '/', icon: 'grid' },
  { label: 'Work Orders', path: '/work-orders', icon: 'wrench' },
  { label: 'Vehicles', path: '/vehicles', icon: 'car' },
  { label: 'Customers', path: '/customers', icon: 'users' },
  { label: 'Parts', path: '/parts', icon: 'sliders' },
  { label: 'Team', path: '/team', icon: 'team' },
] as const

export const topNavItems = ['Dashboard', 'Inventory', 'Schedule', 'Reports'] as const

export const stats = [
  {
    eyebrow: '+2 today',
    label: 'Active Repairs',
    value: '12 Vehicles',
    icon: 'lift',
    tone: 'emerald',
  },
  {
    eyebrow: '12% vs last week',
    label: "Today's Revenue",
    value: '$4,250 USD',
    icon: 'cash',
    tone: 'blue',
  },
  {
    eyebrow: 'Pending action',
    label: 'New Bookings',
    value: '05 Requests',
    icon: 'calendar',
    tone: 'blue',
  },
  {
    eyebrow: 'Full capacity',
    label: 'Techs On Duty',
    value: '08/10 Active',
    icon: 'team',
    tone: 'red',
  },
] as const

export const appointments = [
  {
    vehicle: 'Tesla Model S',
    details: 'Plaid Edition · 2023',
    customer: 'Elena Rodriguez',
    service: 'Battery Service',
    status: 'Checking In',
  },
  {
    vehicle: 'Porsche 911',
    details: 'GT3 RS · 2022',
    customer: 'Marcus Thorne',
    service: 'Transmission',
    status: 'Scheduled',
  },
  {
    vehicle: 'Land Rover Defender',
    details: 'V8 Carpathian · 2024',
    customer: 'Julianne West',
    service: 'Diagnostics',
    status: 'Scheduled',
  },
] as const

export const quickActions = [
  { label: 'Create Invoice', icon: 'invoice' },
  { label: 'Register Vehicle', icon: 'grid' },
  { label: 'Order Parts', icon: 'cart' },
] as const

export const activity = [
  {
    label: 'Invoice #8829 Paid',
    meta: '2 mins ago · Client: Marcus Thorne',
    icon: 'check',
    tone: 'emerald',
  },
  {
    label: 'Repair Completed',
    meta: '15 mins ago · BMW M5 · Bay 4',
    icon: 'wrench',
    tone: 'emerald',
  },
  {
    label: 'New Customer Registered',
    meta: '1 hour ago · Sarah Jenkins',
    icon: 'users',
    tone: 'blue',
  },
  {
    label: 'Low Stock Alert',
    meta: '2 hours ago · Synthetic Oil 5W-30',
    icon: 'alert',
    tone: 'red',
  },
] as const
