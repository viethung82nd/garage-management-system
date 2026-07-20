import { CheckOutlined, CloseOutlined, FileSearchOutlined, PlusOutlined, PrinterOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Input, InputNumber, Row, Select, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  confirmQuotation,
  createQuotation,
  fetchInspectionReports,
  fetchServiceCategories,
  fetchWorkshopRepairOrderById,
  fetchWorkshopRepairOrders,
  fetchWorkshopServices,
  orderId as formatOrderId,
  personName,
  sendQuotation,
  updateQuotation,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiInspectionReport,
  type ApiQuotation,
  type ApiRecommendedService,
  type ApiRepairOrder,
  type ApiService,
  type ApiServiceCategory,
  type QuotationLineKind,
} from '../../shared/api/workshop'
import { resolveApiAssetUrl } from '../../shared/lib/api-client'
import { useAuth } from '../../shared/auth'
import { InlineBanner, advisorPalette, useApiMessage } from '../../widgets/backoffice-shell'
import { ServiceAdvisorShell } from '../../widgets/service-advisor-shell'

const { TextArea } = Input

type QuotationLine = {
  id: string
  serviceId?: string
  description: string
  kind: QuotationLineKind
  quantity: number
  unitPrice: number
}

const kindOptions: Array<{ label: string; value: QuotationLineKind }> = [
  { label: 'Service', value: 'service' },
  { label: 'Part', value: 'part' },
  { label: 'Labor', value: 'labor' },
]

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} ₫`
}

function makeLine(partial: Partial<QuotationLine> = {}): QuotationLine {
  return {
    description: partial.description ?? '',
    id: partial.id ?? crypto.randomUUID(),
    kind: partial.kind ?? 'service',
    quantity: partial.quantity ?? 1,
    serviceId: partial.serviceId,
    unitPrice: partial.unitPrice ?? 0,
  }
}

function servicePrice(service: ApiService) {
  return service.basePrice ?? service.price ?? 0
}

/** Picker shown when the page arrives with no ?orderId= — no fabricated form, just real pending orders to quote. */
function OrderPicker({ orders, onPick }: { orders: ApiRepairOrder[]; onPick: (id: string) => void }) {
  if (!orders.length) {
    return (
      <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
        <Empty description="No repair orders are waiting on a quote right now." />
      </Card>
    )
  }

  return (
    <Card
      bordered={false}
      className="bo-card-hover bo-enter rounded-2xl"
      style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
      title="Select a repair order to quote"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const id = order._id || order.id || ''
          const vehicle = order.vehicleId || order.vehicle
          return (
            <Card bordered key={id} size="small" hoverable onClick={() => onPick(id)} style={{ borderColor: advisorPalette.border, cursor: 'pointer' }}>
              <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{formatOrderId(order)}</div>
              <div style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 4 }}>{personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer')}</div>
              <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
              </div>
            </Card>
          )
        })}
      </div>
    </Card>
  )
}

export function QuotationPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderIdParam = searchParams.get('orderId') || undefined

  const [order, setOrder] = useState<ApiRepairOrder | null>(null)
  const [pendingOrders, setPendingOrders] = useState<ApiRepairOrder[]>([])
  const [inspection, setInspection] = useState<ApiInspectionReport | null>(null)
  const [inspectionLinesAdded, setInspectionLinesAdded] = useState(false)

  const [lines, setLines] = useState<QuotationLine[]>([])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(10)
  const [validDays, setValidDays] = useState(7)
  const [note, setNote] = useState('')
  const [services, setServices] = useState<ApiService[]>([])
  const [categories, setCategories] = useState<ApiServiceCategory[]>([])
  const [pickedServiceId, setPickedServiceId] = useState('')
  const { message: apiMessage, tone: apiTone, showError, showSuccess, clear: clearApiMessage } = useApiMessage()
  const [quotationId, setQuotationId] = useState<string>()
  const [status, setStatus] = useState<'draft' | 'sent' | 'approved' | 'rejected'>('draft')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // No ?orderId= yet — offer real pending orders to pick from instead of a
  // free-typed "RO-2026-0882" field.
  useEffect(() => {
    if (!token || orderIdParam) return
    const authToken = token
    let cancelled = false

    async function loadPending() {
      try {
        const response = await fetchWorkshopRepairOrders(authToken, '?status=pending')
        if (!cancelled) setPendingOrders(unwrapArray<ApiRepairOrder>(response, ['repairOrders', 'orders']))
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load repair orders from the API')
      }
    }

    void loadPending()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

  // ?orderId= present — load the real order (and its inspection, if any) so
  // the header is a read-only fact, not four hand-typed strings that can
  // silently disagree with what Reception/Inspection recorded.
  useEffect(() => {
    if (!token || !orderIdParam) {
      setOrder(null)
      return
    }
    const authToken = token
    let cancelled = false

    async function loadOrder() {
      try {
        const loadedOrder = await fetchWorkshopRepairOrderById(authToken, orderIdParam!)
        if (cancelled) return
        setOrder(loadedOrder)

        if (loadedOrder.inspectionId) {
          const reportResponse = await fetchInspectionReports(authToken, `?repairOrderId=${orderIdParam}`)
          if (cancelled) return
          const reports = unwrapArray<ApiInspectionReport>(reportResponse, ['inspectionReports'])
          setInspection(reports[0] || null)
        } else {
          setInspection(null)
        }
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load this repair order')
      }
    }

    void loadOrder()
    return () => {
      cancelled = true
    }
  }, [token, orderIdParam])

  useEffect(() => {
    if (!token) return
    const authToken = token
    let cancelled = false

    async function loadServices() {
      try {
        const [catalog, categoryResponse] = await Promise.all([fetchWorkshopServices(authToken), fetchServiceCategories()])
        if (cancelled) return
        setServices(Array.isArray(catalog) ? catalog : [])
        setCategories(Array.isArray(categoryResponse) ? categoryResponse : categoryResponse?.categories || [])
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : 'Unable to load the service catalog from the API')
      }
    }

    void loadServices()
    return () => {
      cancelled = true
    }
  }, [token])

  const categoryImageByName = useMemo(
    () => new Map(categories.filter((category) => category.imageUrl).map((category) => [category.name, category.imageUrl])),
    [categories],
  )

  const partsTotal = useMemo(() => lines.filter((line) => line.kind === 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const laborTotal = useMemo(() => lines.filter((line) => line.kind !== 'part').reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [lines])
  const subtotal = partsTotal + laborTotal
  const discountAmount = (subtotal * discountPercent) / 100
  const taxableBase = subtotal - discountAmount
  const taxAmount = (taxableBase * taxPercent) / 100
  const grandTotal = taxableBase + taxAmount

  function updateLine(id: string, patch: Partial<QuotationLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  function addManualLine() {
    setLines((current) => [...current, makeLine()])
  }

  function addServiceLine() {
    const service = services.find((item) => (item._id || item.id) === pickedServiceId)
    if (!service) return
    const serviceId = service._id || service.id

    setLines((current) => {
      const existing = current.find((line) => line.serviceId === serviceId)
      if (existing) {
        return current.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line))
      }
      return [...current, makeLine({ description: service.name || 'Service', kind: 'service', serviceId, unitPrice: servicePrice(service) })]
    })
    setPickedServiceId('')
  }

  function addInspectionLines() {
    if (!inspection?.recommendedServices?.length) return
    setLines((current) => [
      ...current,
      ...inspection.recommendedServices!.map((item: ApiRecommendedService) =>
        makeLine({
          description: item.name || 'Recommended service',
          kind: 'service',
          serviceId: typeof item.serviceId === 'string' ? item.serviceId : item.serviceId?._id,
          unitPrice: item.price || 0,
        }),
      ),
    ])
    setInspectionLinesAdded(true)
  }

  async function persist(nextStatus: 'draft' | 'sent') {
    if (!token || !orderIdParam) return
    if (!lines.length) {
      showError('At least one line item is required before saving or sending a quote.')
      return
    }
    if (lines.some((line) => !line.description.trim())) {
      showError('Every line item needs a description before saving or sending.')
      return
    }
    if (lines.some((line) => line.quantity < 1)) {
      showError('Every line item needs a quantity of at least 1.')
      return
    }

    setSaving(true)
    clearApiMessage()
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + validDays)
      const payload = {
        repairOrderId: orderIdParam,
        discountPercent,
        lines: lines.map((line) => ({ serviceId: line.serviceId, description: line.description, kind: line.kind, quantity: line.quantity, unitPrice: line.unitPrice })),
        note,
        status: nextStatus,
        taxPercent,
        validUntil: validUntil.toISOString(),
      } as ApiQuotation

      let id = quotationId
      if (id) {
        // Already have a draft on the server — update it in place instead of
        // minting a new quote document every time "Save draft" is clicked.
        await updateQuotation(token, id, payload)
      } else {
        const created = await createQuotation(token, payload)
        const quotation = (created && typeof created === 'object' && 'quotation' in created ? (created as any).quotation : created) as ApiQuotation | undefined
        id = quotation?._id || quotation?.id
      }
      let hasEmailOnFile = true
      if (nextStatus === 'sent' && id) {
        const sent = await sendQuotation(token, id)
        hasEmailOnFile = sent.hasEmailOnFile !== false
      }
      setQuotationId(id)
      setStatus(nextStatus)
      showSuccess(
        nextStatus !== 'sent'
          ? 'Draft quote saved.'
          : hasEmailOnFile
            ? 'Quote sent to the customer.'
            : 'Quote marked as sent, but this customer has no email on file — they can only see it by logging in.',
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to save the quote. Check the API connection.')
    } finally {
      setSaving(false)
    }
  }

  async function recordConfirmation(approved: boolean) {
    if (!token || !quotationId || !orderIdParam) return

    setConfirming(true)
    clearApiMessage()
    try {
      await confirmQuotation(token, quotationId, approved)
      setStatus(approved ? 'approved' : 'rejected')
      if (approved) {
        // Approving is what actually copies these lines onto the repair
        // order — continue straight to assigning a technician instead of
        // stranding the SA on a "confirmed" dead end.
        navigate(`/advisor/work-orders?orderId=${orderIdParam}`)
      } else {
        showSuccess('Customer declined this quote. Revise the line items and send a new one.')
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to record the customer confirmation')
    } finally {
      setConfirming(false)
    }
  }

  function startNewRevision() {
    setLines([])
    setQuotationId(undefined)
    setStatus('draft')
    setInspectionLinesAdded(false)
    clearApiMessage()
  }

  const columns: ColumnsType<QuotationLine> = [
    {
      title: 'Item',
      key: 'description',
      render: (_, line) => (
        <div className="flex items-center gap-2">
          <Input onChange={(event) => updateLine(line.id, { description: event.target.value })} placeholder="Item name" value={line.description} />
          {!line.serviceId ? <Tag>Custom</Tag> : null}
        </div>
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

  const editable = status === 'draft'
  const vehicle = order?.vehicleId || order?.vehicle

  return (
    <ServiceAdvisorShell title="Quotations">
      {apiMessage ? <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner> : null}

      {!orderIdParam ? (
        <OrderPicker orders={pendingOrders} onPick={(id) => navigate(`/advisor/quotation?orderId=${id}`)} />
      ) : !order ? (
        <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
          <Empty description="Loading repair order..." />
        </Card>
      ) : (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
                <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Service & labor</div>
                <div style={{ color: advisorPalette.ink, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(laborTotal)}</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
                <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Parts</div>
                <div style={{ color: advisorPalette.ink, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(partsTotal)}</div>
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}>
                <div style={{ color: advisorPalette.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total to customer</div>
                <div style={{ color: advisorPalette.red, fontSize: 24, fontWeight: 700, marginTop: 8 }}>{formatMoney(grandTotal)}</div>
              </Card>
            </Col>
          </Row>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex flex-col gap-5">
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Customer & vehicle">
                <div style={{ color: advisorPalette.textMuted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{formatOrderId(order)}</div>
                <Row gutter={[16, 4]} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Customer</div>
                    <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>{personName(order.customer || vehicle?.customerId || vehicle?.customer, 'Customer')}</div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>Vehicle</div>
                    <div style={{ color: advisorPalette.ink, fontWeight: 700 }}>
                      {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                extra={
                  editable ? (
                    <div className="flex flex-wrap gap-2">
                      {inspection?.recommendedServices?.length && !inspectionLinesAdded ? (
                        <Button icon={<FileSearchOutlined />} onClick={addInspectionLines}>
                          Add {inspection.recommendedServices.length} from inspection
                        </Button>
                      ) : null}
                      <Select
                        onChange={setPickedServiceId}
                        options={services.map((service) => {
                          const imageUrl = service.category ? categoryImageByName.get(service.category) : undefined
                          return {
                            label: (
                              <span className="flex items-center gap-2">
                                {imageUrl ? (
                                  <img alt={service.category} src={resolveApiAssetUrl(imageUrl)} style={{ borderRadius: 6, height: 20, objectFit: 'cover', width: 20 }} />
                                ) : null}
                                {service.name} — {formatMoney(servicePrice(service))}
                              </span>
                            ),
                            value: service._id || service.id,
                          }
                        })}
                        placeholder="Add from catalog..."
                        style={{ width: 260 }}
                        value={pickedServiceId || undefined}
                      />
                      <Button disabled={!pickedServiceId} icon={<PlusOutlined />} onClick={addServiceLine} />
                      <Button icon={<PlusOutlined />} onClick={addManualLine}>
                        Custom line
                      </Button>
                    </div>
                  ) : null
                }
                style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }}
                title={`Line items (${lines.length})`}
              >
                <Table
                  columns={editable ? columns : columns.filter((col) => col.key !== 'actions')}
                  dataSource={lines}
                  locale={{ emptyText: 'No items yet. Add a service from the catalog, from the inspection, or a custom line.' }}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 720 }}
                />
              </Card>

              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Notes & terms">
                <TextArea disabled={!editable} onChange={(event) => setNote(event.target.value)} rows={4} value={note} />
              </Card>
            </div>

            <div className="flex flex-col gap-5" style={{ position: 'sticky', top: 96 }}>
              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.ink, boxShadow: advisorPalette.shadow }}>
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
                    <InputNumber disabled={!editable} max={100} min={0} onChange={(value) => setDiscountPercent(Math.min(100, Math.max(0, Number(value) || 0)))} value={discountPercent} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount amount</span>
                    <span style={{ color: '#ffb4ab', fontWeight: 700 }}>-{formatMoney(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Tax (%)</span>
                    <InputNumber disabled={!editable} max={100} min={0} onChange={(value) => setTaxPercent(Math.min(100, Math.max(0, Number(value) || 0)))} value={taxPercent} />
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
                  <InputNumber disabled={!editable} min={1} onChange={(value) => setValidDays(Math.max(1, Number(value) || 1))} style={{ width: '100%' }} value={validDays} />
                </div>
              </Card>

              <Card bordered={false} className="bo-card-hover bo-enter rounded-2xl" style={{ background: advisorPalette.panel, boxShadow: advisorPalette.shadow, border: `1px solid ${advisorPalette.border}` }} title="Actions">
                <div className="flex flex-col gap-3">
                  <Tag
                    color={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : status === 'sent' ? 'blue' : 'default'}
                    style={{ textAlign: 'center', width: 'fit-content' }}
                  >
                    {{ approved: 'Approved by customer', draft: 'Drafting', rejected: 'Rejected by customer', sent: 'Sent — awaiting customer' }[status]}
                  </Tag>

                  {editable ? (
                    <>
                      <Button block disabled={!lines.length} icon={<SendOutlined />} loading={saving} onClick={() => persist('sent')} type="primary">
                        Send quote to customer
                      </Button>
                      <Button block disabled={!lines.length} loading={saving} onClick={() => persist('draft')}>
                        Save draft
                      </Button>
                    </>
                  ) : status === 'sent' ? (
                    <>
                      <p style={{ color: advisorPalette.textMuted, fontSize: 13 }}>Record what the customer decided (e.g. over the phone).</p>
                      <Button block icon={<CheckOutlined />} loading={confirming} onClick={() => recordConfirmation(true)} type="primary">
                        Customer approved
                      </Button>
                      <Button block danger icon={<CloseOutlined />} loading={confirming} onClick={() => recordConfirmation(false)}>
                        Customer declined
                      </Button>
                    </>
                  ) : status === 'rejected' ? (
                    <Button block onClick={startNewRevision}>
                      Start a new revision
                    </Button>
                  ) : null}

                  <Button block icon={<PrinterOutlined />} onClick={() => window.print()}>
                    Export / print quote
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </ServiceAdvisorShell>
  )
}
