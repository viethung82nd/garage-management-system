export type RepairStatus = 'waiting' | 'in-progress' | 'completed' | 'cancelled'

export type ServiceLine = {
  id: string
  name: string
  price: number
}

export type RepairOrder = {
  id: string
  customerName: string
  vehicleName: string
  licensePlate: string
  status: RepairStatus
  serviceLines: ServiceLine[]
  updatedAt: string
}
