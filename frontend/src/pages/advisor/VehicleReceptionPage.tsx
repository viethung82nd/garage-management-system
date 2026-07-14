import { CarOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Col, Input, Row, Select, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { createVehicleReception, fetchVehicleHistory } from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type PlateStatus = 'idle' | 'checking' | 'found' | 'not-found'

type ReceptionForm = {
  address: string
  appointmentDate: string
  appointmentTime: string
  customerEmail: string
  customerName: string
  engineNo: string
  issueDescription: string
  mileage: string
  model: string
  phone: string
  plate: string
  vin: string
  year: string
}

type HistorySuggestion = {
  id: string
  address: string
  customerEmail: string
  customerName: string
  engineNo: string
  lastVisit: string
  mileage: string
  model: string
  phone: string
  plate: string
  recommendedServices: string[]
  riskNote: string
  vin: string
  year: string
}

const emptyForm: ReceptionForm = {
  address: '',
  appointmentDate: '',
  appointmentTime: '',
  customerEmail: '',
  customerName: '',
  engineNo: '',
  issueDescription: '',
  mileage: '',
  model: '',
  phone: '',
  plate: '',
  vin: '',
  year: '2026',
}

const yearOptions = Array.from({ length: 6 }, (_, i) => String(2026 - i)).map((year) => ({ label: year, value: year }))

function mapHistorySuggestion(item: any): HistorySuggestion {
  const vehicle = item.vehicleId || item.vehicle || item
  const customer = item.customerId || item.customer || vehicle.customerId || {}

  return {
    address: customer.address || item.address || '',
    customerEmail: customer.email || item.customerEmail || '',
    customerName: customer.fullName || item.customerName || 'Customer',
    engineNo: vehicle.engineNumber || item.engineNo || '',
    id: item._id || item.id || vehicle._id || crypto.randomUUID(),
    lastVisit: item.lastVisit || item.updatedAt || item.createdAt || 'Not updated',
    mileage: item.mileage || vehicle.mileage || '',
    model: [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || vehicle.model || item.model || '',
    phone: customer.phone || item.phone || '',
    plate: vehicle.licensePlate || vehicle.plate || item.plate || '',
    recommendedServices: item.recommendedServices || item.services?.map((service: any) => service.name || service.serviceId?.name).filter(Boolean) || [],
    riskNote: item.riskNote || item.note || 'No risk notes on file.',
    vin: vehicle.vin || vehicle.chassisNumber || item.vin || '',
    year: String(vehicle.year || item.year || ''),
  }
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export function VehicleReceptionPage() {
  const { token } = useAuth()
  const [form, setForm] = useState<ReceptionForm>(emptyForm)
  const [historySuggestions, setHistorySuggestions] = useState<HistorySuggestion[]>([])
  const [apiMessage, setApiMessage] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [plateStatus, setPlateStatus] = useState<PlateStatus>('idle')
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string>()

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadHistory() {
      setApiMessage(undefined)
      try {
        const response = await fetchVehicleHistory(authToken)
        const rawSuggestions = Array.isArray(response) ? response : response.suggestions || []
        if (!cancelled) setHistorySuggestions(rawSuggestions.map(mapHistorySuggestion))
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load reception history from the API')
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [token])

  const matchingSuggestions = useMemo(() => {
    const normalizedPlate = normalizePlate(form.plate)
    if (!normalizedPlate) {
      return historySuggestions
    }

    return historySuggestions.filter((suggestion) => normalizePlate(suggestion.plate).includes(normalizedPlate))
  }, [form.plate, historySuggestions])

  const activeSuggestion = historySuggestions.find((suggestion) => suggestion.id === appliedSuggestionId)

  function updateField<Key extends keyof ReceptionForm>(key: Key, value: ReceptionForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
    if (key === 'plate') {
      setPlateStatus('idle')
      setAppliedSuggestionId(undefined)
    }
  }

  function applySuggestion(suggestion: HistorySuggestion) {
    setAppliedSuggestionId(suggestion.id)
    setPlateStatus('found')
    setForm((current) => ({
      ...current,
      address: suggestion.address,
      customerEmail: suggestion.customerEmail,
      customerName: suggestion.customerName,
      engineNo: suggestion.engineNo,
      issueDescription: `${suggestion.riskNote}\nRecommended services: ${suggestion.recommendedServices.join(', ')}.`,
      mileage: suggestion.mileage,
      model: suggestion.model,
      phone: suggestion.phone,
      plate: suggestion.plate,
      vin: suggestion.vin,
      year: suggestion.year,
    }))
  }

  async function checkPlate() {
    if (!token) return

    setPlateStatus('checking')
    setApiMessage(undefined)

    try {
      const response = await fetchVehicleHistory(token, form.plate)
      const rawSuggestions = Array.isArray(response) ? response : response.suggestions || []
      const nextSuggestions = rawSuggestions.map(mapHistorySuggestion)
      setHistorySuggestions(nextSuggestions)

      const exactMatch = nextSuggestions.find((suggestion) => normalizePlate(suggestion.plate) === normalizePlate(form.plate))
      const fallbackMatch = nextSuggestions[0]
      const suggestion = exactMatch ?? fallbackMatch

      if (suggestion) {
        applySuggestion(suggestion)
      } else {
        setAppliedSuggestionId(undefined)
        setPlateStatus('not-found')
      }
    } catch (err) {
      setAppliedSuggestionId(undefined)
      setPlateStatus('not-found')
      setApiMessage(err instanceof Error ? err.message : 'Unable to look up vehicle history from the API')
    }
  }

  async function submitReception() {
    if (!token) return

    setSaving(true)
    setApiMessage(undefined)

    try {
      await createVehicleReception(token, { ...form, historySuggestionId: appliedSuggestionId || '' })
      setApiMessage('Reception saved through the API.')
      setForm(emptyForm)
      setAppliedSuggestionId(undefined)
      setPlateStatus('idle')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to save the reception form')
    } finally {
      setSaving(false)
    }
  }

  const searchLabel = {
    checking: 'Checking...',
    found: 'History found',
    idle: 'Check history',
    'not-found': 'No history found',
  }[plateStatus]

  return (
    <ServiceAdvisorShell title="Vehicle reception">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <form onSubmit={(event) => { event.preventDefault(); void submitReception() }}>
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div style={{ flex: 1 }}>
                <LabeledField label="License plate">
                  <Input
                    onChange={(event) => updateField('plate', event.target.value.toUpperCase())}
                    placeholder="29A-123.45"
                    prefix={<CarOutlined style={{ color: advisorPalette.red }} />}
                    size="large"
                    value={form.plate}
                  />
                </LabeledField>
              </div>
              <Button
                icon={plateStatus === 'found' ? <CheckOutlined /> : <SearchOutlined />}
                loading={plateStatus === 'checking'}
                onClick={checkPlate}
                size="large"
                type="primary"
              >
                {searchLabel}
              </Button>
            </div>

            <Row gutter={12} style={{ marginTop: 20 }}>
              <Col span={8}>
                <div style={{ background: advisorPalette.panelAlt, borderRadius: 16, padding: 16 }}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Matching profiles</div>
                  <div style={{ color: advisorPalette.ink, fontSize: 18, fontWeight: 700, marginTop: 6 }}>{matchingSuggestions.length} found</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: advisorPalette.panelAlt, borderRadius: 16, padding: 16 }}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Suggested service</div>
                  <div style={{ color: advisorPalette.red, fontSize: 14, fontWeight: 700, marginTop: 6 }}>
                    {activeSuggestion?.recommendedServices[0] ?? 'Select a profile to see suggestions'}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ background: '#fff1f1', borderRadius: 16, padding: 16 }}>
                  <div style={{ color: advisorPalette.red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Risk note</div>
                  <div style={{ color: advisorPalette.ink, fontSize: 14, fontWeight: 700, marginTop: 6 }}>{activeSuggestion?.riskNote ?? 'No risk notes yet'}</div>
                </div>
              </Col>
            </Row>
          </Card>

          <Card
            bordered={false}
            className="rounded-[32px]"
            style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}
            title="Prior visit history"
          >
            <p style={{ color: advisorPalette.textMuted, marginBottom: 16, marginTop: -8 }}>
              Pick a matching profile to auto-fill the customer, vehicle, and suggested services below.
            </p>
            <div className="grid gap-3 xl:grid-cols-3">
              {matchingSuggestions.map((suggestion) => {
                const applied = appliedSuggestionId === suggestion.id
                return (
                  <Card
                    bordered
                    key={suggestion.id}
                    size="small"
                    style={{ borderColor: applied ? advisorPalette.red : advisorPalette.border }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{suggestion.plate}</div>
                        <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>{suggestion.model}</div>
                      </div>
                      {applied ? <Tag color="red">Applied</Tag> : null}
                    </div>
                    <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                      <Avatar size={20} style={{ background: advisorPalette.ink, fontSize: 10 }}>{getUserInitials(suggestion.customerName)}</Avatar>
                      <span style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600 }}>{suggestion.customerName}</span>
                    </div>
                    <div style={{ color: advisorPalette.textMuted, fontSize: 12, marginTop: 4 }}>Last visit: {suggestion.lastVisit}</div>
                    <div className="flex flex-wrap gap-1" style={{ marginTop: 8 }}>
                      {suggestion.recommendedServices.slice(0, 2).map((service) => (
                        <Tag key={service}>{service}</Tag>
                      ))}
                    </div>
                    <Button block icon={<CheckOutlined />} onClick={() => applySuggestion(suggestion)} style={{ marginTop: 12 }}>
                      Apply from history
                    </Button>
                  </Card>
                )
              })}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-8">
              <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Customer & vehicle information">
                <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Customer</div>
                <Row gutter={16}>
                  <Col span={12}>
                    <LabeledField label="Full name">
                      <Input onChange={(event) => updateField('customerName', event.target.value)} placeholder="John Smith" value={form.customerName} />
                    </LabeledField>
                  </Col>
                  <Col span={12}>
                    <LabeledField label="Phone number">
                      <Input onChange={(event) => updateField('phone', event.target.value)} placeholder="555-0100" value={form.phone} />
                    </LabeledField>
                  </Col>
                  <Col span={12} style={{ marginTop: 16 }}>
                    <LabeledField label="Email">
                      <Input onChange={(event) => updateField('customerEmail', event.target.value)} placeholder="customer@example.com" type="email" value={form.customerEmail} />
                    </LabeledField>
                  </Col>
                  <Col span={12} style={{ marginTop: 16 }}>
                    <LabeledField label="Address">
                      <Input onChange={(event) => updateField('address', event.target.value)} placeholder="123 Main Street" value={form.address} />
                    </LabeledField>
                  </Col>
                </Row>

                <div style={{ borderTop: `1px solid ${advisorPalette.border}`, marginTop: 20, paddingTop: 20 }}>
                  <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Vehicle</div>
                  <Row gutter={16}>
                    <Col span={16}>
                      <LabeledField label="Make / model">
                        <Input onChange={(event) => updateField('model', event.target.value)} placeholder="Toyota Camry" value={form.model} />
                      </LabeledField>
                    </Col>
                    <Col span={8}>
                      <LabeledField label="Model year">
                        <Select onChange={(value) => updateField('year', value)} options={yearOptions} style={{ width: '100%' }} value={form.year} />
                      </LabeledField>
                    </Col>
                    <Col span={12} style={{ marginTop: 16 }}>
                      <LabeledField label="Current mileage">
                        <Input onChange={(event) => updateField('mileage', event.target.value)} placeholder="24,500" value={form.mileage} />
                      </LabeledField>
                    </Col>
                    <Col span={12} style={{ marginTop: 16 }}>
                      <LabeledField label="VIN">
                        <Input onChange={(event) => updateField('vin', event.target.value)} placeholder="WBS33AZ08PCM44882" value={form.vin} />
                      </LabeledField>
                    </Col>
                    <Col span={12} style={{ marginTop: 16 }}>
                      <LabeledField label="Engine number">
                        <Input onChange={(event) => updateField('engineNo', event.target.value)} placeholder="ENG-987654" value={form.engineNo} />
                      </LabeledField>
                    </Col>
                  </Row>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card bordered={false} className="flex h-full flex-col rounded-[32px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }} title={<span style={{ color: 'white' }}>Request & appointment</span>}>
                <div className="flex flex-col gap-5">
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                      Issue description / requested service
                    </div>
                    <TextArea
                      onChange={(event) => updateField('issueDescription', event.target.value)}
                      placeholder="Describe the vehicle's condition or the requested service package..."
                      rows={7}
                      value={form.issueDescription}
                    />
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                      Promised return date
                    </div>
                    <input
                      onChange={(event) => updateField('appointmentDate', event.target.value)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 0, borderRadius: 8, color: 'white', padding: '10px 12px', width: '100%' }}
                      type="date"
                      value={form.appointmentDate}
                    />
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
                      Promised return time
                    </div>
                    <input
                      onChange={(event) => updateField('appointmentTime', event.target.value)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 0, borderRadius: 8, color: 'white', padding: '10px 12px', width: '100%' }}
                      type="time"
                      value={form.appointmentTime}
                    />
                  </div>
                </div>
                <Button block htmlType="submit" loading={saving} size="large" style={{ marginTop: 24 }} type="primary">
                  {saving ? 'Saving...' : 'Save reception form'}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </ServiceAdvisorShell>
  )
}
