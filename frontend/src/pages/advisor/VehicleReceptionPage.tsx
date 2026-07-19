import { CarOutlined, CheckOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Col, Empty, Input, InputNumber, Row, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createVehicleReception,
  fetchVehicleHistory,
  fetchWorkshopBookingById,
  formatApiDate,
  personName,
  vehicleName as formatVehicleName,
  vehiclePlate,
  type ApiBooking,
} from '../../shared/api/workshop'
import { getUserInitials, useAuth } from '../../shared/auth'
import { InlineBanner, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
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
  year: '',
}

function mapHistorySuggestion(item: any): HistorySuggestion {
  const vehicle = item.vehicleId || item.vehicle || item
  const customer = item.customerId || item.customer || vehicle.customerId || {}

  return {
    address: customer.address || item.address || '',
    customerEmail: customer.email || item.customerEmail || '',
    customerName: customer.fullName || item.customerName || 'Customer',
    engineNo: vehicle.engineNumber || item.engineNo || '',
    id: item._id || item.id || vehicle._id || crypto.randomUUID(),
    lastVisit: item.lastVisit || item.updatedAt || item.createdAt ? formatApiDate(item.lastVisit || item.updatedAt || item.createdAt) : 'Not updated',
    mileage: String(item.mileage || vehicle.mileage || ''),
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId') || undefined
  const [form, setForm] = useState<ReceptionForm>(emptyForm)
  const [historySuggestions, setHistorySuggestions] = useState<HistorySuggestion[]>([])
  const { message: apiMessage, showError, clear: clearApiMessage } = useApiMessage()
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReceptionForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [plateStatus, setPlateStatus] = useState<PlateStatus>('idle')
  const [appliedSuggestionId, setAppliedSuggestionId] = useState<string>()
  const [newWalkIn, setNewWalkIn] = useState(false)
  const [sourceBooking, setSourceBooking] = useState<ApiBooking | null>(null)

  // Arriving from "Confirm" on the booking-requests queue: pre-fill from the
  // booking instead of asking the SA to search for a customer that's already
  // sitting right there in the booking record.
  useEffect(() => {
    if (!token || !bookingId) return
    let cancelled = false

    async function loadBooking() {
      try {
        const response = await fetchWorkshopBookingById(token!, bookingId!)
        const booking = ('booking' in response && response.booking ? response.booking : response) as ApiBooking
        if (cancelled || !booking) return
        setSourceBooking(booking)
        const customer = booking.customerId || booking.customer
        const vehicle = booking.vehicleId || booking.vehicle
        setForm((current) => ({
          ...current,
          customerName: personName(customer, ''),
          phone: typeof customer === 'object' ? customer?.phone || '' : '',
          customerEmail: typeof customer === 'object' ? customer?.email || '' : '',
          plate: vehiclePlate(vehicle).replace('Chưa có biển số', ''),
          model: formatVehicleName(vehicle).replace('Chưa rõ xe', ''),
          vin: vehicle?.vin || vehicle?.chassisNumber || '',
        }))
        setPlateStatus('found')
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load the booking to receive')
      }
    }

    void loadBooking()
    return () => {
      cancelled = true
    }
  }, [token, bookingId])

  const revealed = Boolean(bookingId) || plateStatus !== 'idle' || newWalkIn

  useEffect(() => {
    if (!token) return
    const authToken = token

    let cancelled = false

    async function loadHistory() {
      clearApiMessage()
      try {
        const response = await fetchVehicleHistory(authToken)
        const rawSuggestions = Array.isArray(response) ? response : response.suggestions || []
        if (!cancelled) setHistorySuggestions(rawSuggestions.map(mapHistorySuggestion))
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load reception history from the API')
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
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
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

  const phonePattern = /^[0-9+()\-.\s]{7,20}$/
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function todayIso() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  // Fields can arrive from history-suggestion/booking prefill data, not just
  // typing, so don't trust the declared string type — a raw API value
  // (e.g. mileage as a Number) reaching .trim() throws outside the try/catch
  // below and used to fail completely silently (no banner, no console-visible
  // link back to the form).
  function validateForm(): Partial<Record<keyof ReceptionForm, string>> {
    const errors: Partial<Record<keyof ReceptionForm, string>> = {}
    const customerName = String(form.customerName ?? '').trim()
    const phone = String(form.phone ?? '').trim()
    const email = String(form.customerEmail ?? '').trim()
    const plate = String(form.plate ?? '').trim()
    const mileage = String(form.mileage ?? '').trim()
    const appointmentDate = String(form.appointmentDate ?? '').trim()

    if (!customerName) errors.customerName = 'Customer name is required.'
    if (!phone) errors.phone = 'Phone number is required.'
    else if (!phonePattern.test(phone)) errors.phone = 'Enter a valid phone number.'
    if (email && !emailPattern.test(email)) errors.customerEmail = 'Enter a valid email address.'
    if (!plate) errors.plate = 'License plate is required.'
    if (mileage && Number.isNaN(Number(mileage.replace(/,/g, '')))) errors.mileage = 'Mileage must be a number.'
    if (appointmentDate && appointmentDate < todayIso()) errors.appointmentDate = 'Promised return date cannot be in the past.'
    return errors
  }

  async function checkPlate() {
    if (!token) return

    setPlateStatus('checking')
    clearApiMessage()

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
      showError(err instanceof Error ? err.message : 'Unable to look up vehicle history from the API')
    }
  }

  async function submitReception() {
    if (!token) return

    setSaving(true)
    clearApiMessage()

    // Everything below — including validation — is inside this try/catch on
    // purpose: an unexpected throw from validateForm() used to reject
    // silently (no banner, nothing in the UI) because it ran outside any
    // catch block. Now any failure of any kind always ends up on screen.
    try {
      const errors = validateForm()
      setFieldErrors(errors)
      if (Object.keys(errors).length > 0) {
        showError('Fix the highlighted fields before saving.')
        return
      }

      const response = await createVehicleReception(token, {
        bookingId: sourceBooking?.id || sourceBooking?._id || bookingId,
        customerName: form.customerName,
        phone: form.phone,
        customerEmail: form.customerEmail || undefined,
        plate: form.plate,
        model: form.model || undefined,
        vin: form.vin || undefined,
        engineNo: form.engineNo || undefined,
        mileage: form.mileage || undefined,
        issueDescription: form.issueDescription.trim() || undefined,
        promisedAt: form.appointmentDate ? new Date(`${form.appointmentDate}T${form.appointmentTime || '00:00'}`).toISOString() : undefined,
      })
      // The reception just minted the repair order every later stage
      // attaches to — carry it forward instead of dropping the SA back into
      // an empty form with no way to continue the job.
      navigate(`/advisor/inspection?orderId=${response.repairOrder._id || response.repairOrder.id}`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to save the reception form')
    } finally {
      setSaving(false)
    }
  }

  const searchResultTag = {
    checking: null,
    found: <Tag color="green">History found — form pre-filled below</Tag>,
    idle: null,
    'not-found': <Tag>No prior visit for this plate — fill in the details below</Tag>,
  }[plateStatus]

  return (
    <ServiceAdvisorShell title="Vehicle reception">
      {apiMessage ? <InlineBanner tone="error">{apiMessage}</InlineBanner> : null}

      <form onSubmit={(event) => { event.preventDefault(); void submitReception() }}>
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div style={{ flex: 1 }}>
                <LabeledField label="License plate">
                  <Input
                    onChange={(event) => updateField('plate', event.target.value.toUpperCase())}
                    placeholder="29A-123.45"
                    prefix={<CarOutlined style={{ color: advisorPalette.red }} />}
                    size="large"
                    status={fieldErrors.plate ? 'error' : undefined}
                    value={form.plate}
                  />
                  {fieldErrors.plate ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.plate}</div> : null}
                </LabeledField>
              </div>
              <Button
                icon={plateStatus === 'found' ? <CheckOutlined /> : <SearchOutlined />}
                loading={plateStatus === 'checking'}
                onClick={checkPlate}
                size="large"
                type="primary"
              >
                Check history
              </Button>
              <Button icon={<UserAddOutlined />} onClick={() => setNewWalkIn(true)} size="large">
                New walk-in customer
              </Button>
            </div>

            {searchResultTag ? <div style={{ marginTop: 16 }}>{searchResultTag}</div> : null}
          </Card>

          <Card
            bordered={false}
            className="bo-card-hover bo-enter rounded-2xl"
            style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
            title="Prior visit history"
          >
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

          {!revealed ? (
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
            >
              <Empty description="Search a plate above, pick a matching profile, or start a new walk-in customer to begin a reception." />
            </Card>
          ) : (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="flex flex-col gap-5 lg:col-span-8">
              {activeSuggestion && activeSuggestion.riskNote !== 'No risk notes on file.' ? (
                <InlineBanner tone="error">Risk note from a prior visit: {activeSuggestion.riskNote}</InlineBanner>
              ) : null}

              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Customer & vehicle information">
                <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Customer</div>
                <Row gutter={16}>
                  <Col span={12}>
                    <LabeledField label="Full name">
                      <Input onChange={(event) => updateField('customerName', event.target.value)} placeholder="John Smith" status={fieldErrors.customerName ? 'error' : undefined} value={form.customerName} />
                      {fieldErrors.customerName ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.customerName}</div> : null}
                    </LabeledField>
                  </Col>
                  <Col span={12}>
                    <LabeledField label="Phone number">
                      <Input onChange={(event) => updateField('phone', event.target.value)} placeholder="555-0100" status={fieldErrors.phone ? 'error' : undefined} value={form.phone} />
                      {fieldErrors.phone ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.phone}</div> : null}
                    </LabeledField>
                  </Col>
                  <Col span={12} style={{ marginTop: 16 }}>
                    <LabeledField label="Email">
                      <Input onChange={(event) => updateField('customerEmail', event.target.value)} placeholder="customer@example.com" status={fieldErrors.customerEmail ? 'error' : undefined} type="email" value={form.customerEmail} />
                      {fieldErrors.customerEmail ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.customerEmail}</div> : null}
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
                        <InputNumber
                          max={new Date().getFullYear() + 1}
                          min={1980}
                          onChange={(value) => updateField('year', value ? String(value) : '')}
                          placeholder="2020"
                          style={{ width: '100%' }}
                          value={form.year ? Number(form.year) : undefined}
                        />
                      </LabeledField>
                    </Col>
                    <Col span={12} style={{ marginTop: 16 }}>
                      <LabeledField label="Current mileage">
                        <Input onChange={(event) => updateField('mileage', event.target.value)} placeholder="24,500" status={fieldErrors.mileage ? 'error' : undefined} value={form.mileage} />
                        {fieldErrors.mileage ? <div style={{ color: advisorPalette.red, fontSize: 12, marginTop: 4 }}>{fieldErrors.mileage}</div> : null}
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
              <Card bordered={false} className="flex h-full flex-col rounded-2xl" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }} title={<span style={{ color: 'white' }}>Request & appointment</span>}>
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
                      min={todayIso()}
                      onChange={(event) => updateField('appointmentDate', event.target.value)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: fieldErrors.appointmentDate ? '1px solid #ffb4ab' : 0, borderRadius: 8, color: 'white', padding: '10px 12px', width: '100%' }}
                      type="date"
                      value={form.appointmentDate}
                    />
                    {fieldErrors.appointmentDate ? <div style={{ color: '#ffb4ab', fontSize: 12, marginTop: 4 }}>{fieldErrors.appointmentDate}</div> : null}
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
          )}
        </div>
      </form>
    </ServiceAdvisorShell>
  )
}
