import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import {
  approveTransferRequestApi,
  fetchTransferRequests,
  formatApiDate,
  orderId,
  personName,
  rejectTransferRequestApi,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type ApiTransferRequest,
  type TransferRequestStatus,
} from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

type TransferRequestRow = {
  id: string
  fromTechnician: string
  toTechnician: string
  orderLabel: string
  vehicleLabel: string
  reason: string
  status: TransferRequestStatus
  requestedAt: string
}

const statusLabels: Record<TransferRequestStatus, string> = {
  approved: 'Approved',
  pending: 'Pending',
  rejected: 'Rejected',
}

const statusColors: Record<TransferRequestStatus, string> = {
  approved: 'green',
  pending: 'gold',
  rejected: 'default',
}

const statusFilterOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'All', value: '' },
]

function mapTransferRequest(request: ApiTransferRequest): TransferRequestRow {
  const repairOrder = typeof request.repairOrderId === 'object' ? (request.repairOrderId as ApiRepairOrder) : undefined
  const vehicle = repairOrder?.vehicleId || repairOrder?.vehicle

  return {
    fromTechnician: personName(request.fromTechnicianId, 'Technician'),
    id: request._id || request.id || crypto.randomUUID(),
    orderLabel: repairOrder ? orderId(repairOrder) : 'Repair order',
    reason: request.reason || 'No reason provided.',
    requestedAt: formatApiDate(request.requestedAt),
    status: request.status || 'pending',
    toTechnician: personName(request.toTechnicianId, 'Technician'),
    vehicleLabel: vehicle ? `${vehicleName(vehicle)} - ${vehiclePlate(vehicle)}` : 'Not updated',
  }
}

export function TransferRequestReviewPage() {
  const { token } = useAuth()
  const [requests, setRequests] = useState<TransferRequestRow[]>([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [apiMessage, setApiMessage] = useState<string>()
  const [resolvingId, setResolvingId] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadRequests() {
      setLoading(true)
      setApiMessage(undefined)
      try {
        const query = statusFilter ? `?status=${statusFilter}` : ''
        const response = await fetchTransferRequests(authToken, query)
        const nextRequests = unwrapArray<ApiTransferRequest>(response, ['transferRequests']).map(mapTransferRequest)
        if (!cancelled) setRequests(nextRequests)
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load transfer requests from the API')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadRequests()
    return () => {
      cancelled = true
    }
  }, [token, statusFilter])

  async function resolveRequest(id: string, action: 'approve' | 'reject') {
    if (!token) return

    setResolvingId(id)
    setApiMessage(undefined)
    try {
      if (action === 'approve') await approveTransferRequestApi(token, id)
      else await rejectTransferRequestApi(token, id)
      setRequests((current) => current.filter((request) => request.id !== id))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to resolve the transfer request')
    } finally {
      setResolvingId(undefined)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'pending').length

  const columns: ColumnsType<TransferRequestRow> = [
    {
      title: 'Repair order',
      key: 'order',
      render: (_, request) => (
        <div>
          <div style={{ color: advisorPalette.red, fontSize: 12, fontWeight: 700 }}>{request.orderLabel}</div>
          <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{request.vehicleLabel}</div>
        </div>
      ),
    },
    {
      key: 'fromTechnician',
      render: (_, request) => (
        <div className="flex items-center gap-2">
          <Avatar size={20} style={{ background: advisorPalette.ink, fontSize: 10 }}>{getUserInitials(request.fromTechnician)}</Avatar>
          {request.fromTechnician}
        </div>
      ),
      title: 'From',
    },
    {
      key: 'toTechnician',
      render: (_, request) => (
        <div className="flex items-center gap-2">
          <Avatar size={20} style={{ background: advisorPalette.red, fontSize: 10 }}>{getUserInitials(request.toTechnician)}</Avatar>
          {request.toTechnician}
        </div>
      ),
      title: 'To',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Requested',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, request) => <Tag color={statusColors[request.status]}>{statusLabels[request.status]}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, request) => (
        <div className="flex justify-end gap-2">
          <Button
            disabled={request.status !== 'pending'}
            icon={<CheckOutlined />}
            loading={resolvingId === request.id}
            onClick={() => resolveRequest(request.id, 'approve')}
            type="primary"
          />
          <Button
            disabled={request.status !== 'pending'}
            icon={<CloseOutlined />}
            loading={resolvingId === request.id}
            onClick={() => resolveRequest(request.id, 'reject')}
          />
        </div>
      ),
    },
  ]

  return (
    <ServiceAdvisorShell title="Transfer requests">
      <StatCard label="Pending transfer requests" note="Awaiting your decision" palette={advisorPalette} value={String(pendingCount).padStart(2, '0')} />

      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
        <div style={{ marginBottom: 20 }}>
          <Select onChange={setStatusFilter} options={statusFilterOptions} style={{ width: 200 }} value={statusFilter} />
        </div>

        <Table columns={columns} dataSource={requests} loading={loading} pagination={false} rowKey="id" scroll={{ x: 960 }} />
      </Card>
    </ServiceAdvisorShell>
  )
}
