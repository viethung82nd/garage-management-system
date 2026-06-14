import type { CustomerTimelineStep } from '../../../shared/ui/kapa-customer'

export type TrackingRecord = {
  plate: string
  phone: string
  bookingId: string
  customerName: string
  customerId: string
  vehicle: string
  intakeType: 'Appointment' | 'Walk-in'
  garageName: string
  currentStatus: string
  currentStatusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  estimatedCompletion: string
  paymentStatus: string
  paymentTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  serviceAdvisor: string
  technician: string
  approvedServices: string[]
  additionalProposal?: string
  invoiceId: string
  quotedTotal: string
  paymentMethod: string
  timeline: CustomerTimelineStep[]
  stageLabel: string
  stageValue: string
  progressPercent: string
}

export const trackingRecords: TrackingRecord[] = [
  {
    plate: '51H-12345',
    phone: '0901234567',
    bookingId: 'RO-240611-08',
    customerName: 'Nguyen Minh Hung',
    customerId: 'CUS-1082',
    vehicle: 'Toyota Vios 2021',
    intakeType: 'Appointment',
    garageName: 'Kapa Auto Care Center',
    currentStatus: 'Repair in progress',
    currentStatusTone: 'in-progress',
    estimatedCompletion: 'Today, 5:30 PM',
    paymentStatus: 'Awaiting settlement',
    paymentTone: 'pending',
    serviceAdvisor: 'Tran Hoang',
    technician: 'Le Duc',
    approvedServices: ['Engine diagnostics', 'Oil change', 'Brake fluid flush'],
    additionalProposal: 'Front brake pad replacement awaiting customer approval.',
    invoiceId: 'INV-240611-08',
    quotedTotal: '$228.00',
    paymentMethod: 'Bank transfer or cash',
    stageLabel: 'Current stage',
    stageValue: 'Technician working',
    progressPercent: '4 / 5 steps',
    timeline: [
      {
        id: 'appointment',
        label: 'Appointment received',
        description: 'Booking confirmed.',
        timestamp: '11 Jun • 08:15',
        state: 'complete',
      },
      {
        id: 'checkin',
        label: 'Vehicle check-in',
        description: 'Intake completed.',
        timestamp: '11 Jun • 13:00',
        state: 'complete',
      },
      {
        id: 'diagnosis',
        label: 'Diagnosis completed',
        description: 'Issues confirmed.',
        timestamp: '11 Jun • 14:20',
        state: 'complete',
      },
      {
        id: 'repair',
        label: 'Repair in progress',
        description: 'Final work in progress.',
        timestamp: '11 Jun • 16:05',
        state: 'current',
      },
      {
        id: 'pickup',
        label: 'Awaiting pickup',
        description: 'Ready notice pending.',
        timestamp: 'Expected 11 Jun • 17:30',
        state: 'pending',
      },
    ],
  },
]

export const customerProfile = {
  name: 'Nguyen Minh Hung',
  customerId: 'CUS-1082',
  memberSince: 'March 2024',
  phone: '0901 234 567',
  email: 'hung.nguyen@example.com',
  address: 'District 7, Ho Chi Minh City',
  garageName: 'Kapa Auto Care Center',
  loyaltyTier: 'Online customer',
  activeRepair: 'RO-240611-08',
  nextAppointment: '15 Jun • 09:00 AM',
  activeStatus: 'Repair in progress',
  primaryVehicle: {
    label: 'Primary Vehicle',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    vin: 'RL4BC4CJ0MA001082',
    mileage: '42,180 km',
    lastService: '11 Jun 2026',
  },
  stats: [
    { label: 'Appointments', value: '08' },
    { label: 'Repair Orders', value: '12' },
    { label: 'Paid Invoices', value: '09' },
    { label: 'Active Repair', value: '01' },
  ],
}

export type BookingHistoryRecord = {
  id: string
  invoiceId: string
  dateTime: string
  vehicle: string
  plate: string
  intakeType: 'Appointment' | 'Walk-in'
  advisor: string
  technician: string
  garageName: string
  amount: string
  paymentMethod: string
  invoiceStatus: string
  statusLabel: string
  statusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  primaryService: string
  approvedServices: string[]
  detailImages: string[]
  issueSummary: string
  additionalProposal?: string
}

export const bookingHistory: BookingHistoryRecord[] = [
  {
    id: 'RO-240611-08',
    invoiceId: 'INV-240611-08',
    dateTime: '11 Jun 2026 • 01:00 PM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    intakeType: 'Appointment',
    advisor: 'Tran Hoang',
    technician: 'Le Duc',
    garageName: 'Kapa Auto Care Center',
    amount: '$228.00',
    paymentMethod: 'Pending confirmation',
    invoiceStatus: 'Awaiting final payment',
    statusLabel: 'In Progress',
    statusTone: 'in-progress',
    primaryService: 'Engine diagnostics',
    approvedServices: ['Engine diagnostics', 'Oil change', 'Brake fluid flush'],
    detailImages: [
      '/wp-content/uploads/2024/12/service1.jpg',
      '/wp-content/uploads/2022/11/choose.webp',
      '/wp-content/uploads/2024/12/banner-bg2.jpg',
    ],
    issueSummary: 'Vehicle came in after customer reported weak braking feel and overdue maintenance.',
    additionalProposal: 'Front brake pad replacement awaiting customer approval.',
  },
  {
    id: 'RO-240529-04',
    invoiceId: 'INV-240529-04',
    dateTime: '29 May 2026 • 10:30 AM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    intakeType: 'Walk-in',
    advisor: 'Mai Linh',
    technician: 'Pham Kiet',
    garageName: 'Kapa Auto Care Center',
    amount: '$148.00',
    paymentMethod: 'Card',
    invoiceStatus: 'Paid',
    statusLabel: 'Completed',
    statusTone: 'completed',
    primaryService: 'AC inspection',
    approvedServices: ['AC inspection', 'Cabin filter replacement'],
    detailImages: [
      '/wp-content/uploads/2022/11/choose.webp',
      '/wp-content/uploads/2022/11/banner-bg-2.webp',
    ],
    issueSummary: 'Walk-in customer requested AC cooling check before weekend trip.',
  },
  {
    id: 'RO-240420-11',
    invoiceId: 'INV-240420-11',
    dateTime: '20 Apr 2026 • 03:15 PM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    intakeType: 'Appointment',
    advisor: 'Bao Nguyen',
    technician: 'Nguyen Dat',
    garageName: 'Kapa Auto Care Center',
    amount: '$96.00',
    paymentMethod: 'Cash',
    invoiceStatus: 'Paid',
    statusLabel: 'Ready for Pickup',
    statusTone: 'ready',
    primaryService: 'Wheel alignment',
    approvedServices: ['Tire rotation', 'Wheel alignment'],
    detailImages: [
      '/wp-content/uploads/2022/11/banner-bg-2.webp',
      '/wp-content/uploads/2024/12/service1.jpg',
    ],
    issueSummary: 'Scheduled tire maintenance and alignment after steering drift feedback.',
  },
  {
    id: 'RO-240320-06',
    invoiceId: 'INV-240320-06',
    dateTime: '20 Mar 2026 • 08:45 AM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    intakeType: 'Walk-in',
    advisor: 'Tran Hoang',
    technician: 'Le Minh',
    garageName: 'Kapa Auto Care Center',
    amount: '$72.00',
    paymentMethod: 'Online payment',
    invoiceStatus: 'Partially paid',
    statusLabel: 'Awaiting Parts',
    statusTone: 'pending',
    primaryService: 'Battery check',
    approvedServices: ['Battery check', 'Starter test'],
    detailImages: [
      '/wp-content/uploads/2024/12/banner-bg2.jpg',
      '/wp-content/uploads/2022/11/choose.webp',
    ],
    issueSummary: 'Customer came in after no-start issue; further part replacement was suggested.',
    additionalProposal: 'Battery terminal and cable set recommended after test result.',
  },
]
