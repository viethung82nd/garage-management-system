import type { BookingCardRecord } from '../../../shared/ui/kapa-customer'
import type { CustomerTimelineStep } from '../../../shared/ui/kapa-customer'

export type TrackingRecord = {
  plate: string
  phone: string
  bookingId: string
  customerName: string
  customerId: string
  vehicle: string
  branch: string
  currentStatus: string
  currentStatusTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  estimatedCompletion: string
  paymentStatus: string
  paymentTone: 'completed' | 'in-progress' | 'pending' | 'ready'
  serviceAdvisor: string
  technician: string
  selectedServices: string[]
  timeline: CustomerTimelineStep[]
}

export const trackingRecords: TrackingRecord[] = [
  {
    plate: '51H-12345',
    phone: '0901234567',
    bookingId: 'RO-240611-08',
    customerName: 'Nguyen Minh Hung',
    customerId: 'CUS-1082',
    vehicle: 'Toyota Vios 2021',
    branch: 'Kapa Westminster Bay 2',
    currentStatus: 'Repair in progress',
    currentStatusTone: 'in-progress',
    estimatedCompletion: 'Today, 5:30 PM',
    paymentStatus: 'Awaiting settlement',
    paymentTone: 'pending',
    serviceAdvisor: 'Tran Hoang',
    technician: 'Le Duc',
    selectedServices: ['Engine diagnostics', 'Oil change', 'Brake fluid flush'],
    timeline: [
      {
        id: 'appointment',
        label: 'Appointment received',
        description: 'Booking was confirmed for the afternoon diagnostic window.',
        timestamp: '11 Jun • 08:15',
        state: 'complete',
      },
      {
        id: 'checkin',
        label: 'Vehicle check-in',
        description: 'Service advisor completed intake and initial visual inspection.',
        timestamp: '11 Jun • 13:00',
        state: 'complete',
      },
      {
        id: 'diagnosis',
        label: 'Diagnosis completed',
        description: 'Brake fluid contamination and worn filter set were confirmed.',
        timestamp: '11 Jun • 14:20',
        state: 'complete',
      },
      {
        id: 'repair',
        label: 'Repair in progress',
        description: 'Technician is replacing consumables and finishing final checks.',
        timestamp: '11 Jun • 16:05',
        state: 'current',
      },
      {
        id: 'pickup',
        label: 'Awaiting pickup',
        description: 'Customer will be notified once the order is closed and ready.',
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
  loyaltyTier: 'Preferred customer',
  activeRepair: 'RO-240611-08',
  nextAppointment: '15 Jun • 09:00 AM',
  primaryVehicle: {
    label: 'Primary Vehicle',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    vin: 'RL4BC4CJ0MA001082',
    mileage: '42,180 km',
    lastService: '11 Jun 2026',
  },
  stats: [
    { label: 'Total bookings', value: '12' },
    { label: 'Completed services', value: '9' },
    { label: 'Active repair', value: '01' },
    { label: 'Upcoming visit', value: '01' },
  ],
}

export const bookingHistory: BookingCardRecord[] = [
  {
    id: 'RO-240611-08',
    dateTime: '11 Jun 2026 • 01:00 PM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    services: ['Engine diagnostics', 'Oil change', 'Brake fluid flush'],
    advisor: 'Tran Hoang',
    branch: 'Kapa Westminster Bay 2',
    amount: '$228.00',
    statusLabel: 'In Progress',
    statusTone: 'in-progress',
  },
  {
    id: 'RO-240529-04',
    dateTime: '29 May 2026 • 10:30 AM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    services: ['AC inspection', 'Cabin filter replacement'],
    advisor: 'Mai Linh',
    branch: 'Kapa South Garage',
    amount: '$148.00',
    statusLabel: 'Completed',
    statusTone: 'completed',
  },
  {
    id: 'RO-240420-11',
    dateTime: '20 Apr 2026 • 03:15 PM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    services: ['Tire rotation', 'Wheel alignment'],
    advisor: 'Bao Nguyen',
    branch: 'Kapa Westminster Bay 2',
    amount: '$96.00',
    statusLabel: 'Ready for Pickup',
    statusTone: 'ready',
  },
  {
    id: 'RO-240320-06',
    dateTime: '20 Mar 2026 • 08:45 AM',
    vehicle: 'Toyota Vios 2021',
    plate: '51H-12345',
    services: ['Battery check', 'Starter test'],
    advisor: 'Tran Hoang',
    branch: 'Kapa North Point',
    amount: '$72.00',
    statusLabel: 'Awaiting Parts',
    statusTone: 'pending',
  },
]
