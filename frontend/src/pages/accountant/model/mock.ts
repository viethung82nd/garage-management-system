export type InvoiceStatus = 'Awaiting approval' | 'Ready to bill' | 'Paid' | 'Adjusted'

export type PaymentMethod = 'Cash' | 'Card' | 'Bank transfer' | 'Online gateway'

export type InvoiceRecord = {
  id: string
  repairOrder: string
  customer: string
  vehicle: string
  advisor: string
  technician: string
  status: InvoiceStatus
  paymentMethod: PaymentMethod
  issuedAt: string
  dueAt: string
  subtotal: number
  tax: number
  total: number
}

export const invoiceOverview = [
  { label: 'Invoices pending issue', value: 14, delta: '+3 today', tone: 'amber' as const },
  { label: 'Paid this week', value: 29, delta: '$24.8K', tone: 'emerald' as const },
  { label: 'Adjustments requested', value: 4, delta: '2 urgent', tone: 'violet' as const },
  { label: 'Online payment success', value: '96.4%', delta: '+1.2%', tone: 'blue' as const },
]

export const invoiceRecords: InvoiceRecord[] = [
  {
    id: 'INV-240611-01',
    repairOrder: 'RO-240611-01',
    customer: 'Nguyen Van An',
    vehicle: 'Honda CR-V 2021',
    advisor: 'SA. Thanh',
    technician: 'Tech An',
    status: 'Ready to bill',
    paymentMethod: 'Card',
    issuedAt: '2026-06-11 10:10',
    dueAt: '2026-06-11 17:00',
    subtotal: 120,
    tax: 12,
    total: 132,
  },
  {
    id: 'INV-240611-02',
    repairOrder: 'RO-240611-02',
    customer: 'Tran Thi Mai',
    vehicle: 'Toyota Camry 2020',
    advisor: 'SA. Linh',
    technician: 'Tech Mai',
    status: 'Paid',
    paymentMethod: 'Bank transfer',
    issuedAt: '2026-06-11 09:45',
    dueAt: '2026-06-11 16:30',
    subtotal: 95,
    tax: 9.5,
    total: 104.5,
  },
  {
    id: 'INV-240611-03',
    repairOrder: 'RO-240611-03',
    customer: 'Le Quang Huy',
    vehicle: 'Ford Ranger 2022',
    advisor: 'SA. Phuc',
    technician: 'Tech Huy',
    status: 'Awaiting approval',
    paymentMethod: 'Cash',
    issuedAt: '2026-06-11 11:20',
    dueAt: '2026-06-11 18:00',
    subtotal: 58,
    tax: 5.8,
    total: 63.8,
  },
  {
    id: 'INV-240611-04',
    repairOrder: 'RO-240611-04',
    customer: 'Pham Gia Linh',
    vehicle: 'Mazda CX-5 2023',
    advisor: 'SA. Thanh',
    technician: 'Tech Duc',
    status: 'Adjusted',
    paymentMethod: 'Online gateway',
    issuedAt: '2026-06-11 12:15',
    dueAt: '2026-06-11 18:30',
    subtotal: 76,
    tax: 7.6,
    total: 83.6,
  },
  {
    id: 'INV-240611-05',
    repairOrder: 'RO-240611-05',
    customer: 'Hoang Minh Duc',
    vehicle: 'Hyundai Tucson 2022',
    advisor: 'SA. Linh',
    technician: 'Tech Mai',
    status: 'Ready to bill',
    paymentMethod: 'Card',
    issuedAt: '2026-06-11 14:05',
    dueAt: '2026-06-11 19:00',
    subtotal: 110,
    tax: 11,
    total: 121,
  },
]

export const paymentMix = [
  { label: 'Cash', value: 18, color: '#ffb347' },
  { label: 'Card', value: 26, color: '#f51304' },
  { label: 'Bank transfer', value: 22, color: '#1f365c' },
  { label: 'Online gateway', value: 34, color: '#197b74' },
]

export const serviceRevenue = [
  { label: 'Diagnostics', value: 4.2, color: '#f51304' },
  { label: 'Periodic maintenance', value: 6.8, color: '#1f365c' },
  { label: 'Brake & suspension', value: 5.1, color: '#ffb347' },
  { label: 'AC & electrical', value: 3.6, color: '#197b74' },
]

export const invoiceConfirmation = {
  invoiceId: 'INV-240611-05',
  repairOrder: 'RO-240611-05',
  customer: 'Hoang Minh Duc',
  contact: '+84 912 345 678',
  vehicle: 'Hyundai Tucson 2022 - 51K-888.68',
  serviceAdvisor: 'SA. Linh',
  technician: 'Tech Mai',
  issuedAt: '2026-06-11 14:05',
  paymentMethod: 'Card' as PaymentMethod,
  items: [
    { label: 'Wheel alignment diagnosis', qty: 1, price: 42 },
    { label: 'Front alignment calibration', qty: 1, price: 48 },
    { label: 'Post-service inspection', qty: 1, price: 20 },
  ],
  subtotal: 110,
  tax: 11,
  discount: 0,
  total: 121,
}
