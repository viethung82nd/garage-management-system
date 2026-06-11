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
  { label: 'Total bookings', value: 128, delta: '+12.4%', tone: 'emerald' as const },
  { label: 'Today appointments', value: 24, delta: '+3.1%', tone: 'blue' as const },
  { label: 'Pending confirmations', value: 9, delta: '-1.4%', tone: 'amber' as const },
  { label: 'Revenue this week', value: '$18.4K', delta: '+9.7%', tone: 'violet' as const },
]

export const bookingRecords: BookingRecord[] = [
  {
    key: 'BK-1001',
    customer: 'Nguyen Van An',
    vehicle: 'Honda CR-V 2021',
    service: 'Engine diagnostic',
    date: '2026-06-11',
    time: '08:30',
    status: 'Pending',
    channel: 'Guest',
    amount: 120,
  },
  {
    key: 'BK-1002',
    customer: 'Tran Thi Mai',
    vehicle: 'Toyota Camry 2020',
    service: 'Brake service',
    date: '2026-06-11',
    time: '09:45',
    status: 'Confirmed',
    channel: 'Customer',
    amount: 95,
  },
  {
    key: 'BK-1003',
    customer: 'Le Quang Huy',
    vehicle: 'Ford Ranger 2022',
    service: 'Oil change',
    date: '2026-06-11',
    time: '10:15',
    status: 'In Service',
    channel: 'Guest',
    amount: 58,
  },
  {
    key: 'BK-1004',
    customer: 'Pham Gia Linh',
    vehicle: 'Mazda CX-5 2023',
    service: 'AC inspection',
    date: '2026-06-11',
    time: '11:00',
    status: 'Completed',
    channel: 'Walk-in',
    amount: 76,
  },
  {
    key: 'BK-1005',
    customer: 'Hoang Minh Duc',
    vehicle: 'Hyundai Tucson 2022',
    service: 'Wheel alignment',
    date: '2026-06-11',
    time: '13:20',
    status: 'Pending',
    channel: 'Guest',
    amount: 110,
  },
  {
    key: 'BK-1006',
    customer: 'Vo Thu Ha',
    vehicle: 'Kia Sorento 2024',
    service: 'Battery check',
    date: '2026-06-11',
    time: '14:10',
    status: 'Cancelled',
    channel: 'Customer',
    amount: 0,
  },
]

export const weeklyStatus = [
  { label: 'Pending', value: 18, color: '#f59e0b' },
  { label: 'Confirmed', value: 34, color: '#2563eb' },
  { label: 'In Service', value: 22, color: '#8b5cf6' },
  { label: 'Completed', value: 46, color: '#10b981' },
]

