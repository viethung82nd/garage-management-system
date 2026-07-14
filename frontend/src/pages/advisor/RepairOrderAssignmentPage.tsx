import { CheckOutlined, ProfileOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import {
  createWorkshopRepairOrder,
  fetchServiceCategories,
  fetchWorkshopServices,
  fetchWorkshopTechnicians,
  updateWorkshopRepairOrder,
  type ApiService,
  type ApiServiceCategory,
  type ApiTechnician,
} from '../../shared/api/workshop'
import { resolveApiAssetUrl } from '../../shared/lib/api-client'
import { useAuth } from '../../shared/auth'
import { advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type ServiceTask = {
  id: string
  estimate: string
  name: string
  parts: string
  selected: boolean
}

type Technician = {
  id: string
  activeOrders: number
  name: string
  skill: string
  status: 'available' | 'busy' | 'offline'
}

type RepairOrderHeader = {
  customerName: string
  customerPhone: string
  vehicleName: string
  plate: string
  vin: string
  odometer: string
  promisedAt: string
  priority: string
}

function mapServiceTask(service: ApiService): ServiceTask {
  return {
    estimate: `${service.estimatedDuration || 45} min`,
    id: service._id || service.id || crypto.randomUUID(),
    name: service.name || 'Unnamed service',
    parts: service.category || 'Per service configuration',
    selected: false,
  }
}

function mapTechnician(technician: ApiTechnician): Technician {
  return {
    activeOrders: technician.activeOrders || 0,
    id: technician._id || technician.id || crypto.randomUUID(),
    name: technician.fullName || technician.email || 'Technician',
    skill: technician.skill || 'Skill not recorded',
    status: technician.status === 'busy' ? 'busy' : technician.status === 'off' || technician.status === 'offline' ? 'offline' : 'available',
  }
}

const statusTag: Record<Technician['status'], { color: string; label: string }> = {
  available: { color: 'green', label: 'Available' },
  busy: { color: 'gold', label: 'Busy' },
  offline: { color: 'default', label: 'Off shift' },
}

const emptyHeader: RepairOrderHeader = {
  customerName: '',
  customerPhone: '',
  odometer: '',
  plate: '',
  priority: '',
  promisedAt: '',
  vehicleName: '',
  vin: '',
}

function newOrderCode() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `RO-${stamp}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

export function RepairOrderAssignmentPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<ServiceTask[]>([])
  const [categories, setCategories] = useState<ApiServiceCategory[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('')
  const [header, setHeader] = useState<RepairOrderHeader>(emptyHeader)
  const [note, setNote] = useState('')
  const [orderCode] = useState(newOrderCode)
  const [saved, setSaved] = useState(false)
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadAssignmentData() {
      setApiMessage(undefined)
      try {
        const [services, technicianList, categoryResponse] = await Promise.all([
          fetchWorkshopServices(authToken),
          fetchWorkshopTechnicians(authToken),
          fetchServiceCategories(),
        ])
        if (cancelled) return

        const serviceTasks = services.map(mapServiceTask)
        const nextTechnicians = technicianList.map(mapTechnician)
        setTasks(serviceTasks)
        setTechnicians(nextTechnicians)
        setCategories(Array.isArray(categoryResponse) ? categoryResponse : categoryResponse?.categories || [])
        setSelectedTechnicianId(nextTechnicians[0]?.id || '')
      } catch (err) {
        if (!cancelled) {
          setApiMessage(err instanceof Error ? err.message : 'Unable to load services/technicians from the API')
        }
      }
    }

    void loadAssignmentData()

    return () => {
      cancelled = true
    }
  }, [token])

  const categoryImageByName = useMemo(
    () => new Map(categories.filter((category) => category.imageUrl).map((category) => [category.name, category.imageUrl])),
    [categories],
  )

  const selectedTasks = useMemo(() => tasks.filter((task) => task.selected), [tasks])
  const selectedTechnician = technicians.find((tech) => tech.id === selectedTechnicianId)
  const totalMinutes = selectedTasks.reduce((sum, task) => sum + Number.parseInt(task.estimate, 10), 0)

  function toggleTask(id: string) {
    setSaved(false)
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, selected: !task.selected } : task)))
  }

  function assignTechnician(id: string) {
    setSaved(false)
    setSelectedTechnicianId(id)
  }

  function updateHeader(field: keyof RepairOrderHeader, value: string) {
    setSaved(false)
    setHeader((current) => ({ ...current, [field]: value }))
  }

  async function createRepairOrder() {
    if (!token) return

    setSaving(true)
    setApiMessage(undefined)
    try {
      const payload = {
        code: orderCode,
        customer: { name: header.customerName, phone: header.customerPhone },
        note,
        priority: header.priority || undefined,
        promisedAt: header.promisedAt || undefined,
        services: selectedTasks.map((task) => ({ serviceId: task.id, quantity: 1 })),
        technicianId: selectedTechnicianId,
        vehicle: { licensePlate: header.plate, model: header.vehicleName, odometer: Number(header.odometer) || undefined, vin: header.vin },
      }
      const created = await createWorkshopRepairOrder(token, payload)
      const id = created._id || created.id
      if (id && selectedTechnicianId) await updateWorkshopRepairOrder(token, id, { technicianId: selectedTechnicianId, status: 'pending' })
      setSaved(true)
      setApiMessage('Repair order created and assigned through the API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to create the repair order')
    } finally {
      setSaving(false)
    }
  }

  const headerFields: Array<{ key: keyof RepairOrderHeader; label: string; placeholder?: string; type?: string }> = [
    { key: 'customerName', label: 'Customer', placeholder: 'John Smith' },
    { key: 'customerPhone', label: 'Phone number', placeholder: '555-0100' },
    { key: 'vehicleName', label: 'Vehicle', placeholder: 'Toyota Camry' },
    { key: 'plate', label: 'License plate', placeholder: '29A-123.45' },
    { key: 'vin', label: 'VIN', placeholder: 'WBS33AZ08PCM44882' },
    { key: 'odometer', label: 'Mileage', placeholder: '24500' },
    { key: 'promisedAt', label: 'Promised date', type: 'date' },
    { key: 'priority', label: 'Priority', placeholder: 'High / Normal' },
  ]

  return (
    <ServiceAdvisorShell title="Work orders">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Customer & vehicle">
            <Row gutter={[16, 16]}>
              {headerFields.map((field) => (
                <Col key={field.key} span={12} xl={6}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                    {field.label}
                  </div>
                  <Input
                    onChange={(event) => updateHeader(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    type={field.type}
                    value={header[field.key]}
                  />
                </Col>
              ))}
            </Row>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Service tasks">
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      background: task.selected ? '#fffafa' : advisorPalette.panelAlt,
                      border: `1px solid ${task.selected ? advisorPalette.red : advisorPalette.border}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      padding: 16,
                      textAlign: 'left',
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            alignItems: 'center',
                            background: task.selected ? advisorPalette.red : 'transparent',
                            border: task.selected ? 'none' : `1px solid ${advisorPalette.border}`,
                            borderRadius: 6,
                            color: 'white',
                            display: 'flex',
                            height: 24,
                            justifyContent: 'center',
                            width: 24,
                          }}
                        >
                          {task.selected ? <CheckOutlined style={{ fontSize: 12 }} /> : null}
                        </span>
                        {categoryImageByName.get(task.parts) ? (
                          <img alt={task.parts} src={resolveApiAssetUrl(categoryImageByName.get(task.parts))} style={{ borderRadius: 8, flexShrink: 0, height: 32, objectFit: 'cover', width: 32 }} />
                        ) : null}
                        <span style={{ color: advisorPalette.ink, fontWeight: 700 }}>{task.name}</span>
                      </div>
                      <Tag color="red">{task.estimate}</Tag>
                    </div>
                    <div style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 8 }}>Parts: {task.parts}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Assign technician">
              <div className="flex flex-col gap-3">
                {technicians.map((tech) => {
                  const selected = tech.id === selectedTechnicianId
                  const disabled = tech.status === 'offline'
                  return (
                    <button
                      disabled={disabled}
                      key={tech.id}
                      onClick={() => assignTechnician(tech.id)}
                      style={{
                        background: selected ? '#fffafa' : advisorPalette.panelAlt,
                        border: `1px solid ${selected ? advisorPalette.red : advisorPalette.border}`,
                        borderRadius: 12,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                        padding: 16,
                        textAlign: 'left',
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{tech.name}</div>
                          <div style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 2 }}>{tech.skill}</div>
                        </div>
                        <Tag color={statusTag[tech.status].color}>{statusTag[tech.status].label}</Tag>
                      </div>
                      <div className="flex items-center gap-2" style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 10 }}>
                        <ProfileOutlined /> {tech.activeOrders} active orders
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div style={{ color: advisorPalette.ink, fontSize: 16, fontWeight: 700 }}>Ready to send to the workshop</div>
                <div style={{ color: advisorPalette.textMuted, fontSize: 13, marginTop: 4 }}>
                  {selectedTasks.length} task(s) selected, assigned to {selectedTechnician?.name || 'no technician yet'}.
                </div>
              </div>
              <Button
                disabled={!selectedTasks.length || !selectedTechnicianId}
                icon={<CheckOutlined />}
                loading={saving}
                onClick={createRepairOrder}
                size="large"
                type="primary"
              >
                {saving ? 'Creating...' : 'Create & assign work order'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              New work order
            </div>
            <div style={{ color: 'white', fontSize: 26, fontWeight: 700, marginTop: 8 }}>{orderCode}</div>
            <Tag color={saved ? 'green' : 'default'} style={{ marginTop: 8 }}>
              {saved ? 'Order created' : 'Drafting'}
            </Tag>
            <Row gutter={12} style={{ marginTop: 16 }}>
              <Col span={12}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Tasks</div>
                  <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{String(selectedTasks.length).padStart(2, '0')}</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Estimated</div>
                  <div style={{ color: 'white', fontSize: 22, fontWeight: 700, marginTop: 6 }}>{totalMinutes || 0} min</div>
                </div>
              </Col>
            </Row>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 20, paddingTop: 20 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Assigned technician</div>
              <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 8 }}>{selectedTechnician?.name ?? 'Unassigned'}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                {selectedTechnician?.skill ?? 'Choose a technician suited to these tasks.'}
              </div>
            </div>
          </Card>

          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Advisor notes">
            <TextArea
              onChange={(event) => setNote(event.target.value)}
              placeholder="Note the customer's reported issue, priority checks..."
              rows={5}
              value={note}
            />
          </Card>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
