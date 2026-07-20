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
  photos: string[]
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
    photos: [],
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
    image: '/wp-content/uploads/2022/11/choose.webp',
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

export type CustomerInvoiceStatus = 'Paid' | 'Partially paid' | 'Awaiting payment' | 'Updated' | 'Cancelled'

export type CustomerInvoiceLineItem = {
  item: string
  label: string
  description: string
  quantity: number
  unitPrice: string
  lineTotal: string
  kindLabel?: string | null
  addedMidRepair?: boolean
}

export type CustomerInvoiceRecord = {
  id: string
  repairOrderId: string
  bookingId?: string
  issuedAt: string
  serviceDate: string
  vehicle: string
  plate: string
  vin: string
  mileage: string
  advisor: string
  technician: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerAddress: string
  accountantName: string
  invoiceStatus: CustomerInvoiceStatus
  statusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  paymentMethod: 'Cash at garage' | 'Card at counter' | 'Bank transfer'
  paymentNote: string
  subtotal: string
  tax: string
  discount: string
  total: string
  amountPaid: string
  balanceDue: string
  serviceItems: CustomerInvoiceLineItem[]
  issueImages: string[]
  garageName: string
  customerNote?: string
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

export const customerInvoices: CustomerInvoiceRecord[] = [
  {
    id: 'INV-240611-08',
    repairOrderId: 'RO-240611-08',
    bookingId: 'BK-240611-08',
    issuedAt: '11 Jun 2026 • 05:10 PM',
    serviceDate: '11 Jun 2026',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    vin: 'RL4BC4CJ0MA001082',
    mileage: '42,180 km',
    advisor: 'Tran Hoang',
    technician: 'Le Duc',
    customerName: 'Nguyen Minh Hung',
    customerPhone: '0901 234 567',
    customerEmail: 'hung.nguyen@example.com',
    customerAddress: 'District 7, Ho Chi Minh City',
    accountantName: 'Le Thu Ha',
    invoiceStatus: 'Awaiting payment',
    statusTone: 'pending',
    paymentMethod: 'Bank transfer',
    paymentNote: 'Awaiting direct transfer confirmation from customer.',
    subtotal: '$210.00',
    tax: '$18.00',
    discount: '$0.00',
    total: '$228.00',
    amountPaid: '$0.00',
    balanceDue: '$228.00',
    serviceItems: [
      { item: 'SRV-01', label: 'Engine diagnostics', description: 'Confirmed braking feel issue and scanned engine control system.', quantity: 1, unitPrice: '$78.00', lineTotal: '$78.00' },
      { item: 'SRV-02', label: 'Oil change', description: 'Replaced engine oil and oil filter under scheduled maintenance.', quantity: 1, unitPrice: '$68.00', lineTotal: '$68.00' },
      { item: 'SRV-03', label: 'Brake fluid flush', description: 'Flushed old brake fluid and refilled to service standard.', quantity: 1, unitPrice: '$64.00', lineTotal: '$64.00' },
    ],
    issueImages: [
      '/wp-content/uploads/2024/12/service1.jpg',
      '/wp-content/uploads/2022/11/choose.webp',
      '/wp-content/uploads/2024/12/banner-bg2.jpg',
    ],
    garageName: 'Kapa Auto Care Center',
    customerNote: 'Invoice uploaded after repair order completion. Please settle at the service desk or confirm your bank transfer.',
  },
  {
    id: 'INV-240529-04',
    repairOrderId: 'RO-240529-04',
    bookingId: 'BK-240529-04',
    issuedAt: '29 May 2026 • 01:20 PM',
    serviceDate: '29 May 2026',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    vin: 'RL4BC4CJ0MA001082',
    mileage: '41,620 km',
    advisor: 'Mai Linh',
    technician: 'Pham Kiet',
    customerName: 'Nguyen Minh Hung',
    customerPhone: '0901 234 567',
    customerEmail: 'hung.nguyen@example.com',
    customerAddress: 'District 7, Ho Chi Minh City',
    accountantName: 'Le Thu Ha',
    invoiceStatus: 'Paid',
    statusTone: 'completed',
    paymentMethod: 'Card at counter',
    paymentNote: 'Paid directly at the front desk after vehicle handover.',
    subtotal: '$136.00',
    tax: '$12.00',
    discount: '$0.00',
    total: '$148.00',
    amountPaid: '$148.00',
    balanceDue: '$0.00',
    serviceItems: [
      { item: 'SRV-11', label: 'AC inspection', description: 'Checked airflow, cooling efficiency, and compressor response.', quantity: 1, unitPrice: '$64.00', lineTotal: '$64.00' },
      { item: 'SRV-12', label: 'Cabin filter replacement', description: 'Installed new cabin filter after advisor recommendation.', quantity: 1, unitPrice: '$72.00', lineTotal: '$72.00' },
    ],
    issueImages: [
      '/wp-content/uploads/2022/11/choose.webp',
      '/wp-content/uploads/2022/11/banner-bg-2.webp',
    ],
    garageName: 'Kapa Auto Care Center',
  },
  {
    id: 'INV-240420-11',
    repairOrderId: 'RO-240420-11',
    bookingId: 'BK-240420-11',
    issuedAt: '20 Apr 2026 • 04:10 PM',
    serviceDate: '20 Apr 2026',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    vin: 'RL4BC4CJ0MA001082',
    mileage: '40,980 km',
    advisor: 'Bao Nguyen',
    technician: 'Nguyen Dat',
    customerName: 'Nguyen Minh Hung',
    customerPhone: '0901 234 567',
    customerEmail: 'hung.nguyen@example.com',
    customerAddress: 'District 7, Ho Chi Minh City',
    accountantName: 'Le Thu Ha',
    invoiceStatus: 'Updated',
    statusTone: 'ready',
    paymentMethod: 'Cash at garage',
    paymentNote: 'Invoice updated after advisor confirmed the final wheel alignment scope.',
    subtotal: '$88.00',
    tax: '$8.00',
    discount: '$0.00',
    total: '$96.00',
    amountPaid: '$96.00',
    balanceDue: '$0.00',
    serviceItems: [
      { item: 'SRV-21', label: 'Tire rotation', description: 'Balanced tire wear before highway trip preparation.', quantity: 1, unitPrice: '$38.00', lineTotal: '$38.00' },
      { item: 'SRV-22', label: 'Wheel alignment', description: 'Adjusted alignment after steering drift inspection.', quantity: 1, unitPrice: '$50.00', lineTotal: '$50.00' },
    ],
    issueImages: [
      '/wp-content/uploads/2022/11/banner-bg-2.webp',
      '/wp-content/uploads/2024/12/service1.jpg',
    ],
    garageName: 'Kapa Auto Care Center',
    customerNote: 'The invoice total was updated before pickup and posted by accounting for review.',
  },
]
