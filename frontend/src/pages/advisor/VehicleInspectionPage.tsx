import { CheckCircleFilled, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Input, Select, Tag, Upload } from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import { useEffect, useMemo, useState } from 'react'
import {
  createInspectionReport,
  fetchWorkshopBookings,
  fetchWorkshopRepairOrders,
  orderId,
  personName,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiBooking,
  type ApiInspectionItem,
  type ApiRepairOrder,
  type InspectionItemStatus,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { StatCard, advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type InspectionItemRow = ApiInspectionItem & { id: string; category: string; label: string; status: InspectionItemStatus; laborCost: number; partsCost: number; note: string }

type ChecklistGroup = { category: string; items: string[] }

const checklistSeed: ChecklistGroup[] = [
  { category: 'Engine', items: ['Engine oil & leaks', 'Belts & pulleys', 'Cooling system'] },
  { category: 'Brakes', items: ['Front brake pads', 'Rear brake pads', 'Brake fluid & lines'] },
  { category: 'Undercarriage & suspension', items: ['Shock absorbers', 'Tie rods & sway bar', 'Tires & pressure'] },
  { category: 'Electrical & battery', items: ['Battery & charging', 'Lights & signals', 'Alternator'] },
  { category: 'Fluids & filters', items: ['Coolant', 'Transmission fluid', 'Air & oil filters'] },
]

const fuelLevels = ['Empty', '1/4', '1/2', '3/4', 'Full']

const statusLabels: Record<InspectionItemStatus, string> = {
  monitor: 'Monitor',
  ok: 'OK',
  repair: 'Needs repair',
}

const statusColors: Record<InspectionItemStatus, string> = {
  monitor: 'gold',
  ok: 'green',
  repair: 'red',
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`
}

function seedItems(): InspectionItemRow[] {
  return checklistSeed.flatMap((group) =>
    group.items.map((label) => ({
      category: group.category,
      id: crypto.randomUUID(),
      label,
      laborCost: 0,
      note: '',
      partsCost: 0,
      status: 'ok' as InspectionItemStatus,
    })),
  )
}

type SubjectOption = { label: string; value: string; kind: 'booking' | 'repairOrder' }

export function VehicleInspectionPage() {
  const { token } = useAuth()
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const [repairOrders, setRepairOrders] = useState<ApiRepairOrder[]>([])
  const [subjectKey, setSubjectKey] = useState('')
  const [items, setItems] = useState<InspectionItemRow[]>(() => seedItems())
  const [odometer, setOdometer] = useState('')
  const [fuelLevel, setFuelLevel] = useState('1/2')
  const [findings, setFindings] = useState('')
  const [photoFiles, setPhotoFiles] = useState<UploadFile[]>([])
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadSubjects() {
      setApiMessage(undefined)
      try {
        const [bookingResponse, orderResponse] = await Promise.all([
          fetchWorkshopBookings(authToken, '?status=confirmed'),
          fetchWorkshopRepairOrders(authToken),
        ])
        if (cancelled) return
        setBookings(unwrapArray<ApiBooking>(bookingResponse, ['bookings']))
        setRepairOrders(unwrapArray<ApiRepairOrder>(orderResponse, ['repairOrders', 'orders']))
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load bookings/repair orders from the API')
      }
    }

    void loadSubjects()
    return () => {
      cancelled = true
    }
  }, [token])

  const subjectOptions: SubjectOption[] = useMemo(() => {
    const bookingOptions = bookings.map((booking) => ({
      kind: 'booking' as const,
      label: `${personName(booking.customerId || booking.customer, 'Customer')} — ${vehicleName(booking.vehicleId || booking.vehicle)} (${vehiclePlate(booking.vehicleId || booking.vehicle)}) · booking`,
      value: `booking:${booking._id || booking.id}`,
    }))
    const orderOptions = repairOrders.map((order) => ({
      kind: 'repairOrder' as const,
      label: `${personName(order.customer, 'Customer')} — ${vehicleName(order.vehicleId || order.vehicle)} (${vehiclePlate(order.vehicleId || order.vehicle)}) · ${orderId(order)}`,
      value: `repairOrder:${order._id || order.id}`,
    }))
    return [...bookingOptions, ...orderOptions]
  }, [bookings, repairOrders])

  const selectedSubject = subjectOptions.find((option) => option.value === subjectKey)

  function updateItem(id: string, patch: Partial<InspectionItemRow>) {
    setSubmitted(false)
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function setStatus(id: string, status: InspectionItemStatus) {
    setSubmitted(false)
    setItems((current) => current.map((item) => (item.id === id ? (status === 'ok' ? { ...item, laborCost: 0, partsCost: 0, status } : { ...item, status }) : item)))
  }

  const repairItems = useMemo(() => items.filter((item) => item.status === 'repair'), [items])
  const monitorCount = items.filter((item) => item.status === 'monitor').length
  const totalEstimate = repairItems.reduce((sum, item) => sum + item.laborCost + item.partsCost, 0)
  const groups = useMemo(() => checklistSeed.map((seed) => ({ ...seed, list: items.filter((item) => item.category === seed.category) })), [items])

  async function submitInspection() {
    if (!token || !selectedSubject) {
      setApiMessage('Select a booking or repair order to inspect first.')
      return
    }

    const [, subjectId] = subjectKey.split(':')

    setSaving(true)
    setApiMessage(undefined)
    try {
      await createInspectionReport(token, {
        bookingId: selectedSubject.kind === 'booking' ? subjectId : undefined,
        repairOrderId: selectedSubject.kind === 'repairOrder' ? subjectId : undefined,
        estimatedCost: totalEstimate,
        findings,
        fuelLevel,
        items: items.map((item) => ({ category: item.category, label: item.label, laborCost: item.laborCost, note: item.note, partsCost: item.partsCost, status: item.status })),
        odometer: Number(odometer) || undefined,
        photos: photoFiles.map((file) => file.originFileObj as File).filter(Boolean),
      })
      setSubmitted(true)
      setApiMessage('Inspection report submitted.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to submit the inspection report. Check the API connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ServiceAdvisorShell title="Vehicle inspection">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4">
        <StatCard label="Needs repair" palette={advisorPalette} value={repairItems.length} />
        <StatCard label="To monitor" palette={advisorPalette} value={monitorCount} />
        <StatCard label="Estimated cost" palette={advisorPalette} value={formatMoney(totalEstimate)} />
      </div>

      <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Inspection subject">
        <div className="flex flex-wrap items-end gap-4">
          <div style={{ minWidth: 340 }}>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Booking or repair order</div>
            <Select
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              onChange={setSubjectKey}
              options={subjectOptions.map((option) => ({ label: option.label, value: option.value }))}
              placeholder="Select a confirmed booking or an open repair order..."
              showSearch
              style={{ width: '100%' }}
              value={subjectKey || undefined}
            />
          </div>
          <div>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Odometer (km)</div>
            <Input onChange={(event) => setOdometer(event.target.value)} placeholder="e.g. 45200" style={{ width: 160 }} type="number" value={odometer} />
          </div>
          <div>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Fuel level</div>
            <Select onChange={setFuelLevel} options={fuelLevels.map((level) => ({ label: level, value: level }))} style={{ width: 140 }} value={fuelLevel} />
          </div>
          {submitted ? <Tag color="green" icon={<CheckCircleFilled />}>Submitted</Tag> : null}
        </div>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <Card bordered={false} className="rounded-[28px]" key={group.category} style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title={group.category}>
              <div className="flex flex-col gap-4">
                {group.list.map((item) => (
                  <div key={item.id} style={{ background: item.status === 'repair' ? '#fff1f2' : advisorPalette.panelAlt, borderRadius: 18, padding: 16 }}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p style={{ color: advisorPalette.ink, fontWeight: 700 }}>{item.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {(['ok', 'monitor', 'repair'] as InspectionItemStatus[]).map((status) => (
                          <Tag color={item.status === status ? statusColors[status] : undefined} key={status} onClick={() => setStatus(item.id, status)} style={{ cursor: 'pointer' }}>
                            {statusLabels[status]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                    {item.status !== 'ok' ? (
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
                        <Input onChange={(event) => updateItem(item.id, { note: event.target.value })} placeholder="Condition / recommendation" value={item.note} />
                        {item.status === 'repair' ? (
                          <>
                            <Input addonBefore="Labor" onChange={(event) => updateItem(item.id, { laborCost: Math.max(0, Number(event.target.value) || 0) })} type="number" value={item.laborCost} />
                            <Input addonBefore="Parts" onChange={(event) => updateItem(item.id, { partsCost: Math.max(0, Number(event.target.value) || 0) })} type="number" value={item.partsCost} />
                          </>
                        ) : (
                          <div className="flex items-center px-1 lg:col-span-2" style={{ color: '#b45309', fontSize: 13, fontWeight: 600 }}>
                            Recommend re-checking at the next service visit.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
            <p style={{ color: '#ffb4ab', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Inspection summary</p>
            <div className="mt-4 flex flex-col gap-3" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              <div className="flex items-center justify-between">
                <span>Total items</span>
                <span style={{ fontWeight: 700 }}>{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Needs repair</span>
                <span style={{ color: '#ffb4ab', fontWeight: 700 }}>{repairItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>To monitor</span>
                <span style={{ fontWeight: 700 }}>{monitorCount}</span>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16 }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Estimated cost</p>
              <p style={{ color: '#ffb4ab', fontSize: 26, fontWeight: 700, marginTop: 8 }}>{formatMoney(totalEstimate)}</p>
            </div>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Photos">
            <Upload
              beforeUpload={() => false}
              fileList={photoFiles}
              listType="picture-card"
              onChange={({ fileList }) => setPhotoFiles(fileList)}
              accept="image/*"
              multiple
            >
              {photoFiles.length >= 10 ? null : (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
          </Card>

          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Findings">
            <TextArea onChange={(event) => setFindings(event.target.value)} placeholder="Overall assessment of the vehicle's condition..." rows={4} value={findings} />
            <Button block icon={<UploadOutlined />} loading={saving} onClick={submitInspection} style={{ marginTop: 16 }} type="primary">
              Submit inspection report
            </Button>
          </Card>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
