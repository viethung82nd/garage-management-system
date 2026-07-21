import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { Button, Card, Empty, Input, InputNumber, Select, Tag } from "antd";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
} from "../../shared/api/workshop";
import { useAuth } from "../../shared/auth";
import {
  InlineBanner,
  advisorPalette,
  useApiMessage,
} from "../../widgets/backoffice-shell";
import { ServiceAdvisorShell } from "../../widgets/service-advisor-shell";

const { TextArea } = Input;

const GARAGE_NAME = "KAPA AUTO CARE CENTER";
const GARAGE_ADDRESS = "757 Huỳnh Tấn Phát, Phường Phú Thuận, Quận 7, TP.HCM";
const GARAGE_CONTACT =
  "Tel: 0909 579 579  ·  Email: service@kapa.vn  ·  www.kapa.vn";

type QuotationLine = {
  id: string;
  serviceId?: string;
  description: string;
  kind: QuotationLineKind;
  quantity: number;
  unitPrice: number;
};

const kindOptions: Array<{ label: string; value: QuotationLineKind }> = [
  { label: "Part", value: "part" },
  { label: "Labor", value: "labor" },
  { label: "Service", value: "service" },
];

// Ordered sections of the printed quote, one per line kind.
const sections: Array<{ kind: QuotationLineKind; title: string }> = [
  { kind: "part", title: "PARTS & SUPPLIES" },
  { kind: "labor", title: "LABOR" },
  { kind: "service", title: "SERVICES & INSPECTIONS" },
];

function money(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value || 0));
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
function checkInDate(order: ApiRepairOrder): string {
  if (order.createdAt) return formatDateTime(order.createdAt);
  const oid = order._id || order.id;
  if (oid && /^[0-9a-fA-F]{24}$/.test(oid)) {
    const seconds = parseInt(oid.slice(0, 8), 16);
    if (!Number.isNaN(seconds))
      return formatDateTime(new Date(seconds * 1000).toISOString());
  }
  return "—";
}
function makeLine(partial: Partial<QuotationLine> = {}): QuotationLine {
  return {
    description: partial.description ?? "",
    id: partial.id ?? crypto.randomUUID(),
    kind: partial.kind ?? "service",
    quantity: partial.quantity ?? 1,
    serviceId: partial.serviceId,
    unitPrice: partial.unitPrice ?? 0,
  };
}

function servicePrice(service: ApiService) {
  return service.basePrice ?? service.price ?? 0;
}

/** Picker shown when the page arrives with no ?orderId= — real pending orders to quote. */
function OrderPicker({
  orders,
  onPick,
}: {
  orders: ApiRepairOrder[];
  onPick: (id: string) => void;
}) {
  if (!orders.length) {
    return (
      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{
          background: advisorPalette.panel,
          boxShadow: advisorPalette.shadow,
          border: `1px solid ${advisorPalette.border}`,
        }}
      >
        <Empty description="No repair orders pending a quotation." />
      </Card>
    );
  }

  return (
    <Card
      bordered={false}
      className="bo-card-hover bo-enter rounded-2xl"
      style={{
        background: advisorPalette.panel,
        boxShadow: advisorPalette.shadow,
        border: `1px solid ${advisorPalette.border}`,
      }}
      title="Select a repair order to quote"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => {
          const id = order._id || order.id || "";
          const vehicle = order.vehicleId || order.vehicle;
          return (
            <Card
              bordered
              key={id}
              size="small"
              hoverable
              onClick={() => onPick(id)}
              style={{ borderColor: advisorPalette.border, cursor: "pointer" }}
            >
              <div
                style={{
                  color: advisorPalette.textMuted,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {formatOrderId(order)}
              </div>
              <div
                style={{
                  color: advisorPalette.ink,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                {personName(
                  order.customer || vehicle?.customerId || vehicle?.customer,
                  "Customer",
                )}
              </div>
              <div style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                {vehicleName(vehicle)} · {vehiclePlate(vehicle)}
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

/** A read-only "label: value" cell for the quote's info block. */
function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "4px 0",
        borderBottom: `1px dashed ${advisorPalette.border}`,
      }}
    >
      <span
        style={{ color: advisorPalette.textMuted, fontSize: 13, minWidth: 110 }}
      >
        {label}
      </span>
      <span
        style={{ color: advisorPalette.ink, fontSize: 13, fontWeight: 600 }}
      >
        {value === undefined || value === null || value === "" ? "—" : value}
      </span>
    </div>
  );
}

export function QuotationPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("orderId") || undefined;

  const [order, setOrder] = useState<ApiRepairOrder | null>(null);
  const [pendingOrders, setPendingOrders] = useState<ApiRepairOrder[]>([]);
  const [inspection, setInspection] = useState<ApiInspectionReport | null>(
    null,
  );
  const [inspectionLinesAdded, setInspectionLinesAdded] = useState(false);

  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [note, setNote] = useState("");
  const [services, setServices] = useState<ApiService[]>([]);
  const [, setCategories] = useState<ApiServiceCategory[]>([]);
  const [pickedServiceId, setPickedServiceId] = useState("");
  const {
    message: apiMessage,
    tone: apiTone,
    showError,
    showSuccess,
    clear: clearApiMessage,
  } = useApiMessage();
  const [quotationId, setQuotationId] = useState<string>();
  const [status, setStatus] = useState<
    "draft" | "sent" | "approved" | "rejected"
  >("draft");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // No ?orderId= yet — offer real pending orders to pick from.
  useEffect(() => {
    if (!token || orderIdParam) return;
    const authToken = token;
    let cancelled = false;

    async function loadPending() {
      try {
        const response = await fetchWorkshopRepairOrders(
          authToken,
          "?status=pending",
        );
        if (!cancelled)
          setPendingOrders(
            unwrapArray<ApiRepairOrder>(response, ["repairOrders", "orders"]),
          );
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error
              ? err.message
              : "Unable to load the repair order list.",
          );
      }
    }

    void loadPending();
    return () => {
      cancelled = true;
    };
  }, [token, orderIdParam]);

  // ?orderId= present — load the real order and its inspection (if any).
  useEffect(() => {
    if (!token || !orderIdParam) {
      setOrder(null);
      return;
    }
    const authToken = token;
    let cancelled = false;

    async function loadOrder() {
      try {
        const loadedOrder = await fetchWorkshopRepairOrderById(
          authToken,
          orderIdParam!,
        );
        if (cancelled) return;
        setOrder(loadedOrder);

        if (loadedOrder.inspectionId) {
          const reportResponse = await fetchInspectionReports(
            authToken,
            `?repairOrderId=${orderIdParam}`,
          );
          if (cancelled) return;
          const reports = unwrapArray<ApiInspectionReport>(reportResponse, [
            "inspectionReports",
          ]);
          setInspection(reports[0] || null);
        } else {
          setInspection(null);
        }
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error
              ? err.message
              : "Unable to load this repair order.",
          );
      }
    }

    void loadOrder();
    return () => {
      cancelled = true;
    };
  }, [token, orderIdParam]);

  useEffect(() => {
    if (!token) return;
    const authToken = token;
    let cancelled = false;

    async function loadServices() {
      try {
        const [catalog, categoryResponse] = await Promise.all([
          fetchWorkshopServices(authToken),
          fetchServiceCategories(),
        ]);
        if (cancelled) return;
        setServices(Array.isArray(catalog) ? catalog : []);
        setCategories(
          Array.isArray(categoryResponse)
            ? categoryResponse
            : categoryResponse?.categories || [],
        );
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error
              ? err.message
              : "Unable to load the service catalog.",
          );
      }
    }

    void loadServices();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Coming straight from the inspection: pre-fill the quote with the services
  // the SA flagged, so they land on a ready-to-price sheet instead of a blank one.
  useEffect(() => {
    if (
      inspection?.recommendedServices?.length &&
      !inspectionLinesAdded &&
      lines.length === 0
    ) {
      addInspectionLines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspection]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [lines],
  );
  const discountAmount = (subtotal * discountPercent) / 100;
  const taxableBase = subtotal - discountAmount;
  const taxAmount = (taxableBase * taxPercent) / 100;
  const grandTotal = taxableBase + taxAmount;

  function updateLine(id: string, patch: Partial<QuotationLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function addManualLine(kind: QuotationLineKind) {
    setLines((current) => [...current, makeLine({ kind })]);
  }

  function addServiceLine() {
    const service = services.find(
      (item) => (item._id || item.id) === pickedServiceId,
    );
    if (!service) return;
    const serviceId = service._id || service.id;

    setLines((current) => {
      const existing = current.find((line) => line.serviceId === serviceId);
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...current,
        makeLine({
          description: service.name || "Service",
          kind: "service",
          serviceId,
          unitPrice: servicePrice(service),
        }),
      ];
    });
    setPickedServiceId("");
  }

  function addInspectionLines() {
    if (!inspection?.recommendedServices?.length) return;
    setLines((current) => [
      ...current,
      ...inspection.recommendedServices!.map((item: ApiRecommendedService) =>
        makeLine({
          description: item.name || "Recommended service",
          kind: "service",
          serviceId:
            typeof item.serviceId === "string"
              ? item.serviceId
              : item.serviceId?._id,
          unitPrice: item.price || 0,
        }),
      ),
    ]);
    setInspectionLinesAdded(true);
  }

  function validateLines() {
    if (!lines.length) {
      showError(
        "At least one line item is required before saving or confirming a quotation.",
      );
      return false;
    }
    if (lines.some((line) => !line.description.trim())) {
      showError("Each line item needs a job / part name.");
      return false;
    }
    if (lines.some((line) => line.quantity < 1)) {
      showError("Each line item needs a minimum quantity of 1.");
      return false;
    }
    return true;
  }

  /** Create the quote (or update the existing draft) and return its id. */
  async function ensureSaved(): Promise<string | null> {
    if (!token || !orderIdParam) return null;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);
    const payload = {
      repairOrderId: orderIdParam,
      discountPercent,
      lines: lines.map((line) => ({
        serviceId: line.serviceId,
        description: line.description,
        kind: line.kind,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
      note,
      status: "draft",
      taxPercent,
      validUntil: validUntil.toISOString(),
    } as ApiQuotation;

    if (quotationId) {
      await updateQuotation(token, quotationId, payload);
      return quotationId;
    }
    const created = await createQuotation(token, payload);
    const quotation = (
      created && typeof created === "object" && "quotation" in created
        ? (created as { quotation?: ApiQuotation }).quotation
        : created
    ) as ApiQuotation | undefined;
    const id = quotation?._id || quotation?.id;
    if (id) setQuotationId(id);
    return id ?? null;
  }

  async function saveDraft() {
    if (!validateLines()) return;
    setSaving(true);
    clearApiMessage();
    try {
      await ensureSaved();
      showSuccess("Draft quotation saved.");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Unable to save the quotation.",
      );
    } finally {
      setSaving(false);
    }
  }

  // Walk-in flow: the customer is right there, so the SA records their decision
  // directly — no "send to customer" round-trip. Approving is what copies these
  // lines onto the repair order.
  async function handleConfirm(approved: boolean) {
    if (!validateLines()) return;
    setConfirming(true);
    clearApiMessage();
    try {
      const id = await ensureSaved();
      if (!id) throw new Error("Unable to create the quotation.");
      await confirmQuotation(token!, id, approved);
      setStatus(approved ? "approved" : "rejected");
      if (approved) {
        navigate(`/advisor/work-orders?orderId=${orderIdParam}`);
      } else {
        showSuccess(
          "Customer declined the quotation. Revise the line items and confirm again.",
        );
      }
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Unable to record customer confirmation.",
      );
    } finally {
      setConfirming(false);
    }
  }

  function startNewRevision() {
    setLines([]);
    setQuotationId(undefined);
    setStatus("draft");
    setInspectionLinesAdded(false);
    clearApiMessage();
  }

  const editable = status === "draft";
  const vehicle = order?.vehicleId || order?.vehicle;
  const customer = order?.customer || vehicle?.customerId || vehicle?.customer;

  const statusMeta = {
    approved: { color: "green", label: "Customer approved" },
    draft: { color: "default", label: "Drafting quotation" },
    rejected: { color: "red", label: "Customer declined" },
    sent: { color: "blue", label: "Sent to customer" },
  }[status];

  const cellStyle: CSSProperties = {
    border: `1px solid ${advisorPalette.border}`,
    padding: "6px 8px",
    fontSize: 13,
    verticalAlign: "top",
  };
  const headStyle: CSSProperties = {
    ...cellStyle,
    background: "#f8fafc",
    color: advisorPalette.textMuted,
    fontWeight: 700,
    textAlign: "center",
    textTransform: "uppercase",
    fontSize: 11,
  };

  return (
    <ServiceAdvisorShell title="Repair quotation">
      {apiMessage ? (
        <InlineBanner tone={apiTone}>{apiMessage}</InlineBanner>
      ) : null}

      {!orderIdParam ? (
        <OrderPicker
          orders={pendingOrders}
          onPick={(id) => navigate(`/advisor/quotation?orderId=${id}`)}
        />
      ) : !order ? (
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          style={{
            background: advisorPalette.panel,
            boxShadow: advisorPalette.shadow,
            border: `1px solid ${advisorPalette.border}`,
          }}
        >
          <Empty description="Loading repair order..." />
        </Card>
      ) : (
        <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* The printable quote sheet */}
          <div className="flex flex-col gap-5">
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
            >
              {/* Header */}
              <div
                style={{
                  borderBottom: `2px solid ${advisorPalette.ink}`,
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    color: advisorPalette.ink,
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {GARAGE_NAME}
                </div>
                <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>
                  {GARAGE_ADDRESS}
                </div>
                <div style={{ color: advisorPalette.textMuted, fontSize: 12 }}>
                  {GARAGE_CONTACT}
                </div>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div
                    style={{
                      color: advisorPalette.ink,
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: 1,
                    }}
                  >
                    REPAIR QUOTATION
                  </div>
                  <div
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Quote no.: {order.code || formatOrderId(order)}
                  </div>
                </div>
              </div>

              {/* Quotation info */}
              <div
                style={{
                  color: advisorPalette.ink,
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Quotation info
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                <div>
                  <InfoRow
                    label="Customer"
                    value={personName(customer, "Walk-in")}
                  />
                  <InfoRow label="Phone" value={customer?.phone} />
                  <InfoRow
                    label="Contact person"
                    value={personName(customer, "—")}
                  />
                  <InfoRow
                    label="Service type"
                    value={order.serviceCategory || "Repair"}
                  />
                  <InfoRow label="Check-in date" value={checkInDate(order)} />
                  <InfoRow
                    label="Promised completion"
                    value={formatDateTime(order.promisedAt)}
                  />
                </div>
                <div>
                  <InfoRow
                    label="License plate"
                    value={vehiclePlate(vehicle)}
                  />

                  <InfoRow label="Model / Type" value={vehicle?.model} />
                  <InfoRow
                    label="Chassis no."
                    value={vehicle?.chassisNumber || vehicle?.vin}
                  />
                  <InfoRow label="Engine no." value={vehicle?.engineNumber} />
                  <InfoRow
                    label="Mileage"
                    value={
                      [
                        vehicle?.lastKnownMileage != null
                          ? `${money(vehicle.lastKnownMileage)} km`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                  />
                </div>
              </div>

              {/* Customer request */}
              <div
                style={{
                  color: advisorPalette.ink,
                  fontWeight: 700,
                  fontSize: 13,
                  margin: "16px 0 6px",
                  textTransform: "uppercase",
                }}
              >
                Customer request
              </div>
              <div
                style={{
                  border: `1px solid ${advisorPalette.border}`,
                  borderRadius: 8,
                  padding: 10,
                  color: advisorPalette.ink,
                  fontSize: 13,
                  minHeight: 40,
                }}
              >
                {order.issueDescription ||
                  "Repairs / servicing per inspection results."}
              </div>

              {/* Line items table */}
              <div
                style={{
                  color: advisorPalette.textMuted,
                  fontSize: 12,
                  margin: "16px 0 8px",
                }}
              >
                Following your request and our inspection, we are pleased to
                submit the following estimated repair quotation:
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 760,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...headStyle, width: 44 }}>#</th>
                      <th style={{ ...headStyle, textAlign: "left" }}>
                        Job / Part description
                      </th>
                      <th style={{ ...headStyle, width: 64 }}>Unit</th>
                      <th style={{ ...headStyle, width: 80 }}>Qty</th>
                      <th style={{ ...headStyle, width: 130 }}>Unit price</th>
                      <th style={{ ...headStyle, width: 140 }}>Total</th>
                      {editable ? (
                        <th style={{ ...headStyle, width: 44 }}></th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td
                          style={{
                            ...cellStyle,
                            textAlign: "center",
                            color: advisorPalette.textMuted,
                          }}
                          colSpan={editable ? 7 : 6}
                        >
                          No line items yet. Add services from the catalog, from
                          the inspection results, or add a manual line.
                        </td>
                      </tr>
                    ) : (
                      sections
                        .filter((section) =>
                          lines.some((line) => line.kind === section.kind),
                        )
                        .flatMap((section) => {
                          const sectionLines = lines.filter(
                            (line) => line.kind === section.kind,
                          );
                          const sectionTotal = sectionLines.reduce(
                            (sum, line) => sum + line.quantity * line.unitPrice,
                            0,
                          );
                          return [
                            <tr key={`${section.kind}-head`}>
                              <td
                                style={{
                                  ...cellStyle,
                                  background: "#f1f5f9",
                                  fontWeight: 800,
                                  color: advisorPalette.ink,
                                }}
                                colSpan={5}
                              >
                                {section.title}
                              </td>
                              <td
                                style={{
                                  ...cellStyle,
                                  background: "#f1f5f9",
                                  fontWeight: 800,
                                  color: advisorPalette.ink,
                                  textAlign: "right",
                                }}
                              >
                                {money(sectionTotal)}
                              </td>
                              {editable ? (
                                <td
                                  style={{
                                    ...cellStyle,
                                    background: "#f1f5f9",
                                  }}
                                />
                              ) : null}
                            </tr>,
                            ...sectionLines.map((line, index) => (
                              <tr key={line.id}>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {index + 1}
                                </td>
                                <td style={cellStyle}>
                                  {editable ? (
                                    <div className="flex flex-col gap-1">
                                      <Input
                                        size="small"
                                        value={line.description}
                                        placeholder="Job / part name"
                                        onChange={(event) =>
                                          updateLine(line.id, {
                                            description: event.target.value,
                                          })
                                        }
                                      />
                                      <Select
                                        size="small"
                                        value={line.kind}
                                        options={kindOptions}
                                        style={{ width: 120 }}
                                        onChange={(value) =>
                                          updateLine(line.id, { kind: value })
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: advisorPalette.ink,
                                      }}
                                    >
                                      {line.description}
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  Unit
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {editable ? (
                                    <InputNumber
                                      size="small"
                                      min={1}
                                      value={line.quantity}
                                      style={{ width: "100%" }}
                                      onChange={(value) =>
                                        updateLine(line.id, {
                                          quantity: Math.max(
                                            1,
                                            Number(value) || 1,
                                          ),
                                        })
                                      }
                                    />
                                  ) : (
                                    line.quantity.toFixed(2)
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "right" }}
                                >
                                  {editable ? (
                                    <InputNumber
                                      size="small"
                                      min={0}
                                      value={line.unitPrice}
                                      style={{ width: "100%" }}
                                      formatter={(value) =>
                                        money(Number(value) || 0)
                                      }
                                      parser={(value) =>
                                        Number(
                                          (value || "").replace(/[^\d]/g, ""),
                                        )
                                      }
                                      onChange={(value) =>
                                        updateLine(line.id, {
                                          unitPrice: Math.max(
                                            0,
                                            Number(value) || 0,
                                          ),
                                        })
                                      }
                                    />
                                  ) : (
                                    money(line.unitPrice)
                                  )}
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    textAlign: "right",
                                    fontWeight: 700,
                                  }}
                                >
                                  {money(line.quantity * line.unitPrice)}
                                </td>
                                {editable ? (
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <Button
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => removeLine(line.id)}
                                    />
                                  </td>
                                ) : null}
                              </tr>
                            )),
                          ];
                        })
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        style={{
                          ...cellStyle,
                          textAlign: "right",
                          fontWeight: 800,
                          color: advisorPalette.ink,
                          textTransform: "uppercase",
                        }}
                        colSpan={5}
                      >
                        Repair total
                      </td>
                      <td
                        style={{
                          ...cellStyle,
                          textAlign: "right",
                          fontWeight: 800,
                          color: advisorPalette.red,
                          fontSize: 15,
                        }}
                      >
                        {money(grandTotal)}
                      </td>
                      {editable ? <td style={cellStyle} /> : null}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add controls
              {editable ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {inspection?.recommendedServices?.length &&
                  !inspectionLinesAdded ? (
                    <Button
                      icon={<FileSearchOutlined />}
                      onClick={addInspectionLines}
                    >
                      Add {inspection.recommendedServices.length} items from
                      inspection
                    </Button>
                  ) : null}
                  <Select
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onChange={setPickedServiceId}
                    options={services.map((service) => ({
                      label: `${service.name} — ${money(servicePrice(service))}`,
                      value: service._id || service.id,
                    }))}
                    placeholder="Add from service catalog..."
                    style={{ minWidth: 260 }}
                    value={pickedServiceId || undefined}
                  />
                  <Button
                    disabled={!pickedServiceId}
                    icon={<PlusOutlined />}
                    onClick={addServiceLine}
                  />
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("part")}
                  >
                    Part
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("labor")}
                  >
                    Labor
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("service")}
                  >
                    Service
                  </Button>
                </div>
              ) : null} */}

              <div
                style={{
                  color: advisorPalette.ink,
                  fontWeight: 700,
                  fontSize: 13,
                  margin: "16px 0 6px",
                  textTransform: "uppercase",
                }}
              >
                Notes
              </div>
              <TextArea
                disabled={!editable}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                value={note}
                placeholder="Terms, warranty, additional notes..."
              />
            </Card>
          </div>

          {/* Sticky actions / totals */}
          <div
            className="flex flex-col gap-5"
            style={{ position: "sticky", top: 96 }}
          >
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.ink,
                boxShadow: advisorPalette.shadow,
              }}
            >
              <div
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Quote total
              </div>
              <div
                className="mt-4 flex flex-col gap-3"
                style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}
              >
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>{money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Discount (%)</span>
                  <InputNumber
                    disabled={!editable}
                    max={100}
                    min={0}
                    value={discountPercent}
                    onChange={(value) =>
                      setDiscountPercent(
                        Math.min(100, Math.max(0, Number(value) || 0)),
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span style={{ color: "#ffb4ab", fontWeight: 700 }}>
                    -{money(discountAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>VAT tax (%)</span>
                  <InputNumber
                    disabled={!editable}
                    max={100}
                    min={0}
                    value={taxPercent}
                    onChange={(value) =>
                      setTaxPercent(
                        Math.min(100, Math.max(0, Number(value) || 0)),
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <span style={{ fontWeight: 700 }}>{money(taxAmount)}</span>
                </div>
              </div>
              <div
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  marginTop: 16,
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Repair total
                </div>
                <div
                  style={{
                    color: "#ffb4ab",
                    fontSize: 30,
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  {money(grandTotal)} ₫
                </div>
              </div>
            </Card>

            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
              title="Customer confirmation"
            >
              <div className="flex flex-col gap-3">
                <Tag
                  color={statusMeta.color}
                  style={{ textAlign: "center", width: "fit-content" }}
                >
                  {statusMeta.label}
                </Tag>

                {editable ? (
                  <>
                    <p
                      style={{ color: advisorPalette.textMuted, fontSize: 13 }}
                    >
                      Record the customer's decision at the counter.
                    </p>
                    <Button
                      block
                      type="primary"
                      icon={<CheckOutlined />}
                      loading={confirming}
                      disabled={!lines.length}
                      onClick={() => handleConfirm(true)}
                    >
                      Customer approves
                    </Button>
                    <Button
                      block
                      danger
                      icon={<CloseOutlined />}
                      loading={confirming}
                      disabled={!lines.length}
                      onClick={() => handleConfirm(false)}
                    >
                      Customer declines
                    </Button>
                    {/* <Button
                      block
                      loading={saving}
                      disabled={!lines.length}
                      onClick={saveDraft}
                    >
                      Save draft
                    </Button> */}
                  </>
                ) : status === "rejected" ? (
                  <Button block onClick={startNewRevision}>
                    Create new quotation
                  </Button>
                ) : null}

                <Button
                  block
                  icon={<PrinterOutlined />}
                  onClick={() => window.print()}
                >
                  Print / Export quotation
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </ServiceAdvisorShell>
  );
}
