import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Modal, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  approveTransferRequestApi,
  fetchTransferRequests,
  fetchWorkshopTechnicians,
  formatApiDate,
  orderId,
  personName,
  rejectTransferRequestApi,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiRepairOrder,
  type ApiTechnician,
  type ApiTransferRequest,
  type TransferRequestStatus,
} from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { InlineBanner, StatCard, advisorPalette } from '../../widgets/backoffice-shell'
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
    toTechnician: request.toTechnicianId ? personName(request.toTechnicianId, 'Technician') : '—',
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
  const [approveTarget, setApproveTarget] = useState<TransferRequestRow | null>(null)
  const [approveTechId, setApproveTechId] = useState('')
  const [technicians, setTechnicians] = useState<ApiTechnician[]>([])

  const technicianOptions = useMemo(
    () => technicians.map((t) => ({ label: t.fullName || t.email, value: t._id || t.id })),
    [technicians],
  )

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

  // Fetch technicians list for the approve modal
  useEffect(() => {
    if (!token || technicians.length) return
    const authToken = token
    let cancelled = false
    void (async () => {
      try {
        const list = await fetchWorkshopTechnicians(authToken)
        if (!cancelled) setTechnicians(list)
      } catch {
        /* best-effort */
      }
    })()
    return () => { cancelled = true }
  }, [token, technicians.length])

  async function rejectRequest(id: string) {
    if (!token) return
    setResolvingId(id)
    setApiMessage(undefined)
    try {
      await rejectTransferRequestApi(token, id)
      setRequests((current) => current.filter((request) => request.id !== id))
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to reject the transfer request')
    } finally {
      setResolvingId(undefined)
    }
  }

  async function confirmApprove() {
    if (!token || !approveTarget || !approveTechId) return
    setResolvingId(approveTarget.id)
    setApiMessage(undefined)
    try {
      await approveTransferRequestApi(token, approveTarget.id, approveTechId)
      setRequests((current) => current.filter((request) => request.id !== approveTarget.id))
      setApproveTarget(null)
      setApproveTechId('')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to approve the transfer request')
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
            onClick={() => setApproveTarget(request)}
            type="primary"
          />
          <Button
            disabled={request.status !== 'pending'}
            icon={<CloseOutlined />}
            loading={resolvingId === request.id}
            onClick={() => rejectRequest(request.id)}
          />
        </div>
      ),
    },
  ]

  return (
    <ServiceAdvisorShell title="Transfer requests">
      <StatCard label="Pending transfer requests" note="Awaiting your decision" palette={advisorPalette} value={String(pendingCount).padStart(2, '0')} />

      {apiMessage ? <InlineBanner tone="error">{apiMessage}</InlineBanner> : null}

      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
        <div style={{ marginBottom: 20 }}>
          <Select onChange={setStatusFilter} options={statusFilterOptions} style={{ width: 200 }} value={statusFilter} />
        </div>

        <Table
          columns={columns}
          dataSource={requests}
          loading={loading}
          pagination={{ pageSize: 8, showTotal: (total) => `${total} requests` }}
          rowKey="id"
          scroll={{ x: 960 }}
          className="bo-table"
        />
      </Card>
      <Modal
        okText="Approve"
        okButtonProps={{ disabled: !approveTechId, loading: resolvingId !== undefined }}
        onCancel={() => { setApproveTarget(null); setApproveTechId('') }}
        onOk={confirmApprove}
        open={approveTarget !== null}
        title="Approve transfer"
      >
        {approveTarget ? (
          <div className="flex flex-col gap-4">
            <p style={{ margin: 0 }}>
              Assign <strong>{approveTarget.orderLabel}</strong> ({approveTarget.vehicleLabel}) from <strong>{approveTarget.fromTechnician}</strong> to:
            </p>
            <Select
              onChange={setApproveTechId}
              options={technicianOptions}
              placeholder="Select a technician..."
              showSearch
              style={{ width: '100%' }}
              value={approveTechId || undefined}
            />
          </div>
        ) : null}
      </Modal>
    </ServiceAdvisorShell>
  )
}
