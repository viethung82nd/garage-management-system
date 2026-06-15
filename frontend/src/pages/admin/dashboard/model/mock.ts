export type BookingStatus = 'Pending' | 'Confirmed' | 'In Service' | 'Completed' | 'Cancelled'

export type BookingRecord = {
  key: string
  customer: string
  vehicle: string
  service: string
  date: string
  time: string
  status: BookingStatus
  channel: 'Guest' | 'Customer' | 'Walk-in'
  amount: number
}

export const bookingOverview = [
  { label: 'Online appointments', value: 48, delta: '+8.2%', tone: 'blue' as const },
  { label: 'Walk-in receptions', value: 31, delta: '+4.5%', tone: 'amber' as const },
  { label: 'Open repair orders', value: 22, delta: '+2.1%', tone: 'emerald' as const },
  { label: 'Week revenue', value: '$18.4K', delta: '+9.7%', tone: 'violet' as const },
]

export const bookingRecords: BookingRecord[] = [
  {
    key: 'RO-240611-01',
    customer: 'Nguyen Van An',
    vehicle: 'Honda CR-V 2021',
    service: 'Engine diagnostic + quotation',
    date: '2026-06-11',
    time: '08:30',
    status: 'Pending',
    channel: 'Customer',
    amount: 120,
  },
  {
    key: 'RO-240611-02',
    customer: 'Tran Thi Mai',
    vehicle: 'Toyota Camry 2020',
    service: 'Brake service order',
    date: '2026-06-11',
    time: '09:45',
    status: 'Confirmed',
    channel: 'Walk-in',
    amount: 95,
  },
  {
    key: 'RO-240611-03',
    customer: 'Le Quang Huy',
    vehicle: 'Ford Ranger 2022',
    service: 'Periodic maintenance',
    date: '2026-06-11',
    time: '10:15',
    status: 'In Service',
    channel: 'Guest',
    amount: 58,
  },
  {
    key: 'RO-240611-04',
    customer: 'Pham Gia Linh',
    vehicle: 'Mazda CX-5 2023',
    service: 'AC inspection + invoice',
    date: '2026-06-11',
    time: '11:00',
    status: 'Completed',
    channel: 'Walk-in',
    amount: 76,
  },
  {
    key: 'RO-240611-05',
    customer: 'Hoang Minh Duc',
    vehicle: 'Hyundai Tucson 2022',
    service: 'Wheel alignment request',
    date: '2026-06-11',
    time: '13:20',
    status: 'Pending',
    channel: 'Guest',
    amount: 110,
  },
  {
    key: 'RO-240611-06',
    customer: 'Vo Thu Ha',
    vehicle: 'Kia Sorento 2024',
    service: 'Battery check cancellation',
    date: '2026-06-11',
    time: '14:10',
    status: 'Cancelled',
    channel: 'Customer',
    amount: 0,
  },
]

export const weeklyStatus = [
  { label: 'Waiting approval', value: 18, color: '#f59e0b' },
  { label: 'Repair ordered', value: 34, color: '#2563eb' },
  { label: 'In progress', value: 22, color: '#8b5cf6' },
  { label: 'Invoiced', value: 46, color: '#10b981' },
]

