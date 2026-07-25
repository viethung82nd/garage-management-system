import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  FileSearchOutlined,
  PlusOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Card,
  Divider,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Tag,
} from "antd";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SignaturePad } from "../../shared/ui/SignaturePad";
import {
  confirmQuotation,
  createQuotation,
  fetchInspectionReports,
  fetchQuotationVersions,
  fetchServiceCategories,
  fetchWorkshopRepairOrderById,
  fetchWorkshopRepairOrders,
  fetchWorkshopServices,
  orderId as formatOrderId,
  personName,
  searchParts,
  updateQuotation,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  APPROVAL_CHANNELS,
  JOB_TYPES,
  JOB_TYPE_LABELS,
  type ApiInspectionReport,
  type ApiPartOption,
  type ApiQuotation,
  type ApiQuoteVersion,
  type ApiRecommendedService,
  type ApiRepairOrder,
  type ApiService,
  type ApiServiceCategory,
  type ApprovalChannel,
  type JobType,
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
  /** Set when this "part" line was picked from the parts catalogue rather
   *  than hand-typed. Mirrors ApiQuotationLine.partId. */
  partId?: string;
  description: string;
  kind: QuotationLineKind;
  jobType: JobType;
  quantity: number;
  unitPrice: number;
};

const kindOptions: Array<{ label: string; value: QuotationLineKind }> = [
  { label: "Part", value: "part" },
  { label: "Labor", value: "labor" },
  { label: "Service", value: "service" },
];

const CHANNEL_LABELS: Record<ApprovalChannel, string> = {
  app: "App",
  inPerson: "In person",
  phone: "Phone",
  zalo: "Zalo",
  email: "Email",
  sms: "SMS",
};

const jobTypeOptions: Array<{ label: string; value: JobType }> = JOB_TYPES.map(
  (type) => ({ label: JOB_TYPE_LABELS[type], value: type }),
);

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
    jobType: partial.jobType ?? "customerPay",
    quantity: partial.quantity ?? 1,
    serviceId: partial.serviceId,
    partId: partial.partId,
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
  // Full parts catalog, preloaded once — same idea as `services` above, so
  // both catalog pickers open as a browsable dropdown instead of staying
  // empty until the user types something.
  const [partsCatalog, setPartsCatalog] = useState<ApiPartOption[]>([]);
  const [pickedPartId, setPickedPartId] = useState("");
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
  const [approvalRecord, setApprovalRecord] =
    useState<ApiQuotation["approval"]>(null);

  // History of prior edits to this quotation, oldest first — every edit
  // archives an immutable snapshot before overwriting the live figures.
  const [versions, setVersions] = useState<ApiQuoteVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Part-catalogue search results per line id, for the "part" line picker.
  const [partOptions, setPartOptions] = useState<
    Record<string, ApiPartOption[]>
  >({});
  const partSearchTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  // Tracks the value just set by picking a catalogue part, so the AutoComplete's
  // paired onChange (fired for the same selection) doesn't clear partId again.
  const lastPartSelection = useRef<Record<string, string>>({});

  // Authorization modal — opens on Approve/Decline, captures signatures + channel.
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState(true);
  const [confirmChannel, setConfirmChannel] =
    useState<ApprovalChannel>("inPerson");
  const [customerSignature, setCustomerSignature] = useState<string | undefined>();
  const [advisorSignature, setAdvisorSignature] = useState<string | undefined>();

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
        const [catalog, categoryResponse, partsResponse] = await Promise.all([
          fetchWorkshopServices(authToken),
          fetchServiceCategories(),
          searchParts(authToken, ""),
        ]);
        if (cancelled) return;
        setServices(Array.isArray(catalog) ? catalog : []);
        setCategories(
          Array.isArray(categoryResponse)
            ? categoryResponse
            : categoryResponse?.categories || [],
        );
        setPartsCatalog(unwrapArray<ApiPartOption>(partsResponse, ["parts"]));
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

  useEffect(() => {
    if (!token || !quotationId) {
      setVersions([]);
      return;
    }
    const authToken = token;
    const id = quotationId;
    let cancelled = false;

    async function loadVersions() {
      setVersionsLoading(true);
      try {
        const response = await fetchQuotationVersions(authToken, id);
        if (!cancelled) setVersions(response.versions ?? []);
      } catch {
        // History is a nice-to-have alongside the live quote — a failed
        // fetch shouldn't block editing, so this degrades to an empty list.
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    }

    void loadVersions();
    return () => {
      cancelled = true;
    };
  }, [token, quotationId]);

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

  function addPickedPartLine() {
    const part = partsCatalog.find((item) => item._id === pickedPartId);
    if (!part) return;
    setLines((current) => [
      ...current,
      makeLine({
        kind: "part",
        description: part.name,
        partId: part._id,
        unitPrice: part.unitPrice,
      }),
    ]);
    setPickedPartId("");
  }

  // Debounced parts-catalogue lookup for a single "part" line's picker.
  function searchPartsForLine(lineId: string, query: string) {
    if (!token) return;
    if (partSearchTimers.current[lineId]) {
      clearTimeout(partSearchTimers.current[lineId]);
    }
    partSearchTimers.current[lineId] = setTimeout(async () => {
      try {
        const response = await searchParts(token, query);
        const results = unwrapArray<ApiPartOption>(response, ["parts"]);
        setPartOptions((current) => ({ ...current, [lineId]: results }));
      } catch {
        // Search picker degrades to free text on failure — not a hard error.
      }
    }, 300);
  }

  function pickPart(lineId: string, part: ApiPartOption) {
    lastPartSelection.current[lineId] = part.name;
    updateLine(lineId, {
      partId: part._id,
      description: part.name,
      unitPrice: part.unitPrice,
    });
  }

  function editPartDescription(lineId: string, value: string) {
    if (lastPartSelection.current[lineId] === value) {
      delete lastPartSelection.current[lineId];
      updateLine(lineId, { description: value });
      return;
    }
    updateLine(lineId, { description: value, partId: undefined });
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
        partId: line.partId,
        description: line.description,
        kind: line.kind,
        jobType: line.jobType,
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
      const id = await ensureSaved();
      showSuccess("Draft quotation saved.");
      // Editing an existing draft archives the pre-edit state server-side —
      // refresh so the new entry shows up without needing a page reload.
      if (id && token) {
        try {
          const response = await fetchQuotationVersions(token, id);
          setVersions(response.versions ?? []);
        } catch {
          // Non-critical — the history card just won't be current until the
          // next load.
        }
      }
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
  // lines onto the repair order. Opens the signature/channel modal; the actual
  // confirm call happens in submitConfirm() once the SA confirms there.
  function openConfirmModal(approved: boolean) {
    if (!validateLines()) return;
    setConfirmIntent(approved);
    setConfirmChannel("inPerson");
    setCustomerSignature(undefined);
    setAdvisorSignature(undefined);
    setConfirmModalOpen(true);
  }

  async function submitConfirm() {
    if (!token) return;
    setConfirming(true);
    clearApiMessage();
    try {
      const id = await ensureSaved();
      if (!id) throw new Error("Unable to create the quotation.");
      const confirmed = await confirmQuotation(token, id, {
        approved: confirmIntent,
        channel: confirmChannel,
        customerSignature,
        advisorSignature,
      });
      setApprovalRecord(confirmed?.approval ?? null);
      setStatus(confirmIntent ? "approved" : "rejected");
      setConfirmModalOpen(false);
      if (confirmIntent) {
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
    setApprovalRecord(null);
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
                    minWidth: 880,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...headStyle, width: 44 }}>#</th>
                      <th style={{ ...headStyle, textAlign: "left" }}>
                        Job / Part description
                      </th>
                      <th style={{ ...headStyle, width: 120 }}>Job type</th>
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
                          colSpan={editable ? 8 : 7}
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
                                colSpan={6}
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
                                      {line.kind === "part" ? (
                                        <AutoComplete
                                          size="small"
                                          value={line.description}
                                          options={(
                                            partOptions[line.id] ??
                                            partsCatalog
                                          ).map((part) => ({
                                            value: part.name,
                                            label: `${part.name} — ${part.sku} (${money(part.unitPrice)})`,
                                            part,
                                          }))}
                                          filterOption={false}
                                          onSearch={(value) =>
                                            searchPartsForLine(line.id, value)
                                          }
                                          onSelect={(_value, option) =>
                                            pickPart(
                                              line.id,
                                              (
                                                option as unknown as {
                                                  part: ApiPartOption;
                                                }
                                              ).part,
                                            )
                                          }
                                          onChange={(value) =>
                                            editPartDescription(
                                              line.id,
                                              value,
                                            )
                                          }
                                          placeholder="Part name / SKU"
                                          style={{ width: "100%" }}
                                        />
                                      ) : (
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
                                      )}
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
                                      {line.kind === "part" && line.partId ? (
                                        <Tag
                                          color={advisorPalette.teal}
                                          style={{
                                            marginLeft: 6,
                                            fontSize: 10,
                                            lineHeight: "16px",
                                            padding: "0 4px",
                                          }}
                                        >
                                          In stock
                                        </Tag>
                                      ) : null}
                                    </span>
                                  )}
                                </td>
                                <td style={cellStyle}>
                                  {editable ? (
                                    <Select
                                      size="small"
                                      value={line.jobType}
                                      options={jobTypeOptions}
                                      style={{ width: "100%" }}
                                      onChange={(value) =>
                                        updateLine(line.id, { jobType: value })
                                      }
                                    />
                                  ) : line.jobType &&
                                    line.jobType !== "customerPay" ? (
                                    <Tag color={advisorPalette.amber}>
                                      {JOB_TYPE_LABELS[line.jobType]}
                                    </Tag>
                                  ) : null}
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
                        colSpan={6}
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
                  >
                    Add
                  </Button>

                  <Select
                    showSearch
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    onChange={setPickedPartId}
                    options={partsCatalog.map((part) => ({
                      label: `${part.name} — ${part.sku} (${money(part.unitPrice)})`,
                      value: part._id,
                    }))}
                    placeholder="Add from parts catalog..."
                    style={{ minWidth: 260 }}
                    value={pickedPartId || undefined}
                  />
                  <Button
                    disabled={!pickedPartId}
                    icon={<PlusOutlined />}
                    onClick={addPickedPartLine}
                  >
                    Add
                  </Button>

                  <Divider style={{ margin: "0 4px", height: 24 }} type="vertical" />

                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("part")}
                  >
                    Blank part
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("labor")}
                  >
                    Blank labor
                  </Button>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() => addManualLine("service")}
                  >
                    Blank service
                  </Button>
                </div>
              ) : null}

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

              <div
                style={{
                  color: advisorPalette.ink,
                  fontWeight: 700,
                  fontSize: 13,
                  margin: "20px 0 10px",
                  textTransform: "uppercase",
                }}
              >
                Authorization
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "customer",
                      label: "Customer",
                      src: approvalRecord?.customerSignature,
                    },
                    {
                      key: "advisor",
                      label: "Service advisor",
                      src: approvalRecord?.advisorSignature,
                    },
                  ] as const
                ).map((block) => (
                  <div key={block.key} style={{ textAlign: "center" }}>
                    {block.src ? (
                      <img
                        alt={block.label}
                        src={block.src}
                        style={{
                          maxHeight: 80,
                          margin: "0 auto",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          borderBottom: `1px solid ${advisorPalette.ink}`,
                          height: 60,
                        }}
                      />
                    )}
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: advisorPalette.textMuted,
                      }}
                    >
                      {block.label}
                    </div>
                  </div>
                ))}
              </div>
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
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Customer-pay lines only
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
                      onClick={() => openConfirmModal(true)}
                    >
                      Customer approves
                    </Button>
                    <Button
                      block
                      danger
                      icon={<CloseOutlined />}
                      loading={confirming}
                      disabled={!lines.length}
                      onClick={() => openConfirmModal(false)}
                    >
                      Customer declines
                    </Button>
                    <Button
                      block
                      loading={saving}
                      disabled={!lines.length}
                      onClick={saveDraft}
                    >
                      Save draft
                    </Button>
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

            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
              title="Quotation history"
            >
              {versionsLoading ? (
                <span style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                  Loading...
                </span>
              ) : versions.length ? (
                <div
                  className="flex flex-col gap-3"
                  style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}
                >
                  {versions.map((version) => (
                    <div
                      key={version._id ?? version.version}
                      style={{
                        borderBottom: `1px solid ${advisorPalette.border}`,
                        paddingBottom: 10,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          style={{
                            color: advisorPalette.ink,
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          Version {version.version}
                        </span>
                        <span
                          style={{
                            color: advisorPalette.ink,
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {money(version.totalEstimate || 0)} ₫
                        </span>
                      </div>
                      <div
                        style={{
                          color: advisorPalette.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {formatDateTime(version.snapshotAt)}
                        {typeof version.snapshotBy === "object" &&
                        version.snapshotBy?.fullName
                          ? ` · ${version.snapshotBy.fullName}`
                          : ""}
                        {version.reason ? ` · ${version.reason}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ color: advisorPalette.textMuted, fontSize: 13 }}>
                  No revisions yet — a version is archived every time a saved
                  draft is edited again.
                </span>
              )}
            </Card>
          </div>
        </div>
      )}

      <Modal
        cancelText="Cancel"
        confirmLoading={confirming}
        okButtonProps={{ danger: !confirmIntent }}
        okText="Confirm"
        onCancel={() => setConfirmModalOpen(false)}
        onOk={submitConfirm}
        open={confirmModalOpen}
        title="Confirm & sign"
        width={680}
      >
        <Tag color={confirmIntent ? "green" : "red"}>
          {confirmIntent ? "Customer approves quote" : "Customer declines quote"}
        </Tag>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div
              style={{
                color: advisorPalette.textMuted,
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Customer signature
            </div>
            <SignaturePad onChange={setCustomerSignature} value={customerSignature} width={280} />
          </div>
          <div>
            <div
              style={{
                color: advisorPalette.textMuted,
                fontSize: 11,
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Advisor signature
            </div>
            <SignaturePad onChange={setAdvisorSignature} value={advisorSignature} width={280} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              color: advisorPalette.textMuted,
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Channel
          </div>
          <Select
            value={confirmChannel}
            options={APPROVAL_CHANNELS.map((channel) => ({
              label: CHANNEL_LABELS[channel],
              value: channel,
            }))}
            onChange={setConfirmChannel}
            style={{ width: "100%" }}
          />
        </div>
      </Modal>
    </ServiceAdvisorShell>
  );
}
