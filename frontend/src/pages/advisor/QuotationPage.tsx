import { CloseOutlined, PlusOutlined, PrinterOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, InputNumber, Row, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import {
  createQuotation,
  fetchWorkshopServices,
  sendQuotation,
  type ApiQuotation,
  type ApiService,
  type QuotationLineKind,
} from '../../shared/api/workshop'
import { useAuth } from '../../shared/auth'
import { advisorPalette } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type QuotationLine = {
  id: string
  description: string
  kind: QuotationLineKind
  quantity: number
  unitPrice: number
}

type QuotationHeader = {
  code: string
  customerName: string
  customerPhone: string
  vehiclePlate: string
  vehicleName: string
  repairOrderId: string
}

const kindOptions: Array<{ label: string; value: QuotationLineKind }> = [
  { label: 'Service', value: 'service' },
  { label: 'Part', value: 'part' },
  { label: 'Labor', value: 'labor' },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + 'đ'
}

function newQuotationCode() {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `QT-${stamp}-${rand}`
}

function makeLine(partial: Partial<QuotationLine> = {}): QuotationLine {
  return {
    description: partial.description ?? '',
    id: partial.id ?? crypto.randomUUID(),
    kind: partial.kind ?? 'service',
    quantity: partial.quantity ?? 1,
    unitPrice: partial.unitPrice ?? 0,
  }
}

function servicePrice(service: ApiService) {
  return service.basePrice ?? service.price ?? 0
}

export function QuotationPage() {
  const { token } = useAuth()
  const [header, setHeader] = useState<QuotationHeader>({
    code: newQuotationCode(),
    customerName: '',
    customerPhone: '',
    repairOrderId: '',
    vehicleName: '',
    vehiclePlate: '',
  })
  const [lines, setLines] = useState<QuotationLine[]>([makeLine({ description: 'Engine oil change', kind: 'service', unitPrice: 350000 })])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [validDays, setValidDays] = useState(7)
  const [note, setNote] = useState('This quote includes labor for removal and installation. Price may change if extra work is found.')
  const [services, setServices] = useState<ApiService[]>([])
  const [pickedServiceId, setPickedServiceId] = useState('')
  const [apiMessage, setApiMessage] = useState<string>()
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadServices() {
      try {
        const catalog = await fetchWorkshopServices(authToken)
        if (!cancelled) setServices(Array.isArray(catalog) ? catalog : [])
      } catch (err) {
        if (!cancelled) setApiMessage(err instanceof Error ? err.message : 'Unable to load the service catalog from the API')
      }
    }

    void loadServices()
    return () => {
      cancelled = true
    }
  }, [token])

  const partsTotal = useMemo(() => lines.filter((line) => line.kind === 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const laborTotal = useMemo(() => lines.filter((line) => line.kind !== 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const subtotal = partsTotal + laborTotal
  const discountAmount = (subtotal * discountPercent) / 100
  const taxableBase = subtotal - discountAmount
  const taxAmount = (taxableBase * taxPercent) / 100
  const grandTotal = taxableBase + taxAmount

  function updateHeader(field: keyof QuotationHeader, value: string) {
    setStatus('draft')
    setHeader((current) => ({ ...current, [field]: value }))
  }

  function updateLine(id: string, patch: Partial<QuotationLine>) {
    setStatus('draft')
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    setStatus('draft')
    setLines((current) => current.filter((line) => line.id !== id))
  }

  function addManualLine() {
    setStatus('draft')
    setLines((current) => [...current, makeLine()])
  }

  function addServiceLine() {
    const service = services.find((item) => (item._id || item.id) === pickedServiceId)
    if (!service) return
    setStatus('draft')
    setLines((current) => [
      ...current,
      makeLine({ description: service.name || 'Service', kind: 'service', unitPrice: servicePrice(service) }),
    ])
    setPickedServiceId('')
  }

  function buildPayload(nextStatus: 'draft' | 'sent'): ApiQuotation {
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)
    return {
      code: header.code,
      customerName: header.customerName,
      customerPhone: header.customerPhone,
      discountPercent,
      lines: lines.map((line) => ({ description: line.description, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice })),
      note,
      repairOrderId: header.repairOrderId || undefined,
      status: nextStatus,
      taxPercent,
      validUntil: validUntil.toISOString(),
      vehicleName: header.vehicleName,
      vehiclePlate: header.vehiclePlate,
    }
  }

  async function persist(nextStatus: 'draft' | 'sent') {
    if (!token) return
    if (!lines.length) {
      setApiMessage('At least one line item is required before saving or sending a quote.')
      return
    }

    setSaving(true)
    setApiMessage(undefined)
    try {
      const created = await createQuotation(token, buildPayload(nextStatus))
      const quotation = (created && typeof created === 'object' && 'quotation' in created ? created.quotation : created) as ApiQuotation | undefined
      const id = quotation?._id || quotation?.id
      if (nextStatus === 'sent' && id) await sendQuotation(token, id)
      setStatus(nextStatus)
      setApiMessage(nextStatus === 'sent' ? 'Quote sent to the customer through the API.' : 'Draft quote saved through the API.')
    } catch (err) {
      setApiMessage(err instanceof Error ? err.message : 'Unable to save the quote. Check the API connection.')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<QuotationLine> = [
    {
      title: 'Item',
      key: 'description',
      render: (_, line) => (
        <Input onChange={(event) => updateLine(line.id, { description: event.target.value })} placeholder="Item name" value={line.description} />
      ),
    },
    {
      title: 'Kind',
      key: 'kind',
      width: 120,
      render: (_, line) => (
        <Select onChange={(value) => updateLine(line.id, { kind: value })} options={kindOptions} style={{ width: '100%' }} value={line.kind} />
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 90,
      render: (_, line) => (
        <InputNumber min={1} onChange={(value) => updateLine(line.id, { quantity: Math.max(1, Number(value) || 1) })} value={line.quantity} />
      ),
    },
    {
      title: 'Unit price',
      key: 'unitPrice',
      width: 140,
      render: (_, line) => (
        <InputNumber min={0} onChange={(value) => updateLine(line.id, { unitPrice: Math.max(0, Number(value) || 0) })} style={{ width: '100%' }} value={line.unitPrice} />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      render: (_, line) => <span style={{ fontWeight: 700 }}>{formatMoney(line.quantity * line.unitPrice)}</span>,
    },
    {
      key: 'actions',
      render: (_, line) => <Button icon={<CloseOutlined />} onClick={() => removeLine(line.id)} title="Remove item" type="text" />,
    },
  ]

  return (
    <ServiceAdvisorShell title="Quotations">
      {apiMessage ? (
        <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 18, color: '#991b1b', padding: '12px 16px' }}>
          {apiMessage}
        </div>
      ) : null}

      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Service & labor</div>
            <div style={{ color: advisorPalette.ink, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(laborTotal)}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Parts</div>
            <div style={{ color: advisorPalette.ink, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(partsTotal)}</div>
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="rounded-[28px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}>
            <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total to customer</div>
            <div style={{ color: advisorPalette.red, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(grandTotal)}</div>
          </Card>
        </Col>
      </Row>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Customer & vehicle">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Input addonBefore="Customer" onChange={(event) => updateHeader('customerName', event.target.value)} placeholder="John Smith" value={header.customerName} />
              </Col>
              <Col span={12}>
                <Input addonBefore="Phone" onChange={(event) => updateHeader('customerPhone', event.target.value)} placeholder="555-0100" value={header.customerPhone} />
              </Col>
              <Col span={12}>
                <Input addonBefore="Plate" onChange={(event) => updateHeader('vehiclePlate', event.target.value)} placeholder="29A-123.45" value={header.vehiclePlate} />
              </Col>
              <Col span={12}>
                <Input addonBefore="Vehicle" onChange={(event) => updateHeader('vehicleName', event.target.value)} placeholder="Toyota Camry" value={header.vehicleName} />
              </Col>
              <Col span={12}>
                <Input addonBefore="Work order (optional)" onChange={(event) => updateHeader('repairOrderId', event.target.value)} placeholder="RO-2026-0882" value={header.repairOrderId} />
              </Col>
              <Col span={12}>
                <Input addonBefore="Quote code" onChange={(event) => updateHeader('code', event.target.value)} value={header.code} />
              </Col>
            </Row>
          </Card>

          <Card
            bordered={false}
            className="rounded-[32px]"
            extra={
              <div className="flex gap-2">
                <Select
                  onChange={setPickedServiceId}
                  options={services.map((service) => ({ label: `${service.name} — ${formatMoney(servicePrice(service))}`, value: service._id || service.id }))}
                  placeholder="Add from catalog..."
                  style={{ width: 240 }}
                  value={pickedServiceId || undefined}
                />
                <Button disabled={!pickedServiceId} icon={<PlusOutlined />} onClick={addServiceLine} />
                <Button icon={<PlusOutlined />} onClick={addManualLine}>
                  Add line
                </Button>
              </div>
            }
            style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }}
            title={`Line items (${lines.length})`}
          >
            <Table
              columns={columns}
              dataSource={lines}
              locale={{ emptyText: 'No items yet. Add a service from the catalog or click "Add line".' }}
              pagination={false}
              rowKey="id"
              scroll={{ x: 720 }}
            />
          </Card>

          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Notes & terms">
            <TextArea onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
          </Card>
        </div>

        <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Quote summary
            </div>

            <div className="flex flex-col gap-3" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 16 }}>
              <div className="flex items-center justify-between">
                <span>Service & labor</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(laborTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Parts</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(partsTotal)}</span>
              </div>
              <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Discount (%)</span>
                <InputNumber
                  max={100}
                  min={0}
                  onChange={(value) => { setStatus('draft'); setDiscountPercent(Math.min(100, Math.max(0, Number(value) || 0))) }}
                  value={discountPercent}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Discount amount</span>
                <span style={{ color: '#ffb4ab', fontWeight: 700 }}>-{formatMoney(discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Tax (%)</span>
                <InputNumber
                  max={100}
                  min={0}
                  onChange={(value) => { setStatus('draft'); setTaxPercent(Math.min(100, Math.max(0, Number(value) || 0))) }}
                  value={taxPercent}
                />
              </div>
              <div className="flex items-center justify-between">
                <span>Tax amount</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(taxAmount)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total to customer</div>
              <div style={{ color: '#ffb4ab', fontSize: 30, fontWeight: 700, marginTop: 8 }}>{formatMoney(grandTotal)}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Valid for (days)</div>
              <InputNumber
                min={1}
                onChange={(value) => { setStatus('draft'); setValidDays(Math.max(1, Number(value) || 1)) }}
                style={{ width: '100%' }}
                value={validDays}
              />
            </div>
          </Card>

          <Card bordered={false} className="rounded-[32px]" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow }} title="Actions">
            <div className="flex flex-col gap-3">
              <Tag color={status === 'sent' ? 'green' : 'default'} style={{ textAlign: 'center', width: 'fit-content' }}>
                {status === 'sent' ? 'Sent to customer' : 'Drafting'}
              </Tag>
              <Button block disabled={!lines.length} icon={<SendOutlined />} loading={saving} onClick={() => persist('sent')} type="primary">
                Send quote to customer
              </Button>
              <Button block disabled={!lines.length} loading={saving} onClick={() => persist('draft')}>
                Save draft
              </Button>
              <Button block icon={<PrinterOutlined />} onClick={() => window.print()}>
                Export / print quote
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ServiceAdvisorShell>
  )
}
