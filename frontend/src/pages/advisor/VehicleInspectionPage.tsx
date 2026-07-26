import {
  CheckCircleFilled,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Image,
  Input,
  InputNumber,
  Select,
  Table,
  Tag,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createInspectionReport,
  fetchInspectionReports,
  fetchWorkshopRepairOrders,
  fetchWorkshopActiveServices,
  fetchWorkshopServicesByCategory,
  orderId,
  personName,
  unwrapArray,
  vehicleName,
  vehiclePlate,
  type ApiInspectionItem,
  type ApiInspectionReport,
  type ApiRepairOrder,
  type InspectionItemStatus,
} from "../../shared/api/workshop";
import { resolveApiAssetUrl } from "../../shared/lib/api-client";
import { useAuth } from "../../shared/auth";
import {
  InlineBanner,
  StatCard,
  advisorPalette,
  useApiMessage,
} from "../../widgets/backoffice-shell";
import { ServiceAdvisorShell } from "../../widgets/service-advisor-shell";

const { TextArea } = Input;

type InspectionItemRow = ApiInspectionItem & {
  id: string;
  category: string;
  label: string;
  status: InspectionItemStatus;
  laborCost: number;
  partsCost: number;
  note: string;
};

// A selectable catalog service from the booked category. When a category has
// services, the checklist becomes a "tick the services this vehicle needs"
// list — the ticked rows carry to the quote as recommended services.
type ServiceRow = {
  id: string;
  serviceId?: string;
  name: string;
  category: string;
  price: number;
  selected: boolean;
};

type ChecklistGroup = { category: string; items: string[] };

const checklistSeed: ChecklistGroup[] = [
  {
    category: "Engine",
    items: ["Engine oil & leaks", "Belts & pulleys", "Cooling system"],
  },
  {
    category: "Brakes",
    items: ["Front brake pads", "Rear brake pads", "Brake fluid & lines"],
  },
  {
    category: "Undercarriage & suspension",
    items: ["Shock absorbers", "Tie rods & sway bar", "Tires & pressure"],
  },
  {
    category: "Electrical & battery",
    items: ["Battery & charging", "Lights & signals", "Alternator"],
  },
  {
    category: "Fluids & filters",
    items: ["Coolant", "Transmission fluid", "Air & oil filters"],
  },
];

const fuelLevels = ["Empty", "1/4", "1/2", "3/4", "Full"];

const statusLabels: Record<InspectionItemStatus, string> = {
  monitor: "Monitor",
  ok: "OK",
  repair: "Needs repair",
};

const statusColors: Record<InspectionItemStatus, string> = {
  monitor: "gold",
  ok: "green",
  repair: "red",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} ₫`;
}

function seedItems(): InspectionItemRow[] {
  return checklistSeed.flatMap((group) =>
    group.items.map((label) => ({
      category: group.category,
      id: crypto.randomUUID(),
      label,
      laborCost: 0,
      note: "",
      partsCost: 0,
      status: "ok" as InspectionItemStatus,
    })),
  );
}

/** Normalises a checklist/service row into the InspectionReport item shape. */
function buildReportItem(item: {
  category: string;
  label: string;
  status: InspectionItemStatus;
  laborCost?: number;
  partsCost?: number;
  note?: string;
}): ApiInspectionItem {
  return {
    category: item.category,
    label: item.label,
    status: item.status,
    laborCost: item.laborCost ?? 0,
    partsCost: item.partsCost ?? 0,
    note: item.note ?? "",
  };
}

type SubjectOption = {
  label: string;
  value: string;
  vehicleId?: string;
  lastKnownMileage?: number;
  serviceCategory?: string;
};

export function VehicleInspectionPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdParam = searchParams.get("orderId") || undefined;
  const [repairOrders, setRepairOrders] = useState<ApiRepairOrder[]>([]);
  const [subjectKey, setSubjectKey] = useState("");
  const [items, setItems] = useState<InspectionItemRow[]>(() => seedItems());
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("1/2");
  const [findings, setFindings] = useState("");
  const [photoFiles, setPhotoFiles] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [priorReports, setPriorReports] = useState<ApiInspectionReport[]>([]);
  const {
    message: apiMessage,
    showError,
    clear: clearApiMessage,
  } = useApiMessage();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    if (!token) return;
    const authToken = token;
    let cancelled = false;

    async function loadSubjects() {
      clearApiMessage();
      try {
        // Every repair order now gets opened at Reception (see
        // VehicleReceptionPage), so inspection always attaches to a
        // repairOrderId — orders that already have one are filtered out.
        const orderResponse = await fetchWorkshopRepairOrders(
          authToken,
          "?status=pending",
        );
        if (cancelled) return;
        const orders = unwrapArray<ApiRepairOrder>(orderResponse, [
          "repairOrders",
          "orders",
        ]);
        setRepairOrders(orders.filter((order) => !order.inspectionId));
      } catch (err) {
        if (!cancelled)
          showError(
            err instanceof Error
              ? err.message
              : "Unable to load repair orders from the API",
          );
      }
    }

    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const subjectOptions: SubjectOption[] = useMemo(
    () =>
      repairOrders.map((order) => {
        const vehicle = order.vehicleId || order.vehicle;
        return {
          label: `${personName(order.customer || vehicle?.customerId || vehicle?.customer, "Customer")} — ${vehicleName(vehicle)} (${vehiclePlate(vehicle)}) · ${orderId(order)}`,
          value: order._id || order.id || "",
          vehicleId: vehicle?._id || vehicle?.id,
          lastKnownMileage: vehicle?.lastKnownMileage,
          serviceCategory: order.serviceCategory,
        };
      }),
    [repairOrders],
  );

  // Arriving from Reception (or any other stage) via ?orderId= pre-selects
  // the order it just opened, instead of asking the SA to find it again.
  useEffect(() => {
    if (
      orderIdParam &&
      !subjectKey &&
      subjectOptions.some((option) => option.value === orderIdParam)
    ) {
      setSubjectKey(orderIdParam);
    }
  }, [orderIdParam, subjectKey, subjectOptions]);

  // Reception already captured this vehicle's mileage — start the odometer
  // field from that instead of making the advisor type the same number
  // again. Only runs when the selected order changes, so an edit the
  // advisor makes afterward (a fresh reading may differ) is never clobbered.
  useEffect(() => {
    const subject = subjectOptions.find(
      (option) => option.value === subjectKey,
    );
    if (subject?.lastKnownMileage != null) {
      setOdometer(String(subject.lastKnownMileage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  const selectedSubject = subjectOptions.find(
    (option) => option.value === subjectKey,
  );

  useEffect(() => {
    if (!token || !selectedSubject?.vehicleId) {
      setPriorReports([]);
      return;
    }
    const authToken = token;
    const vehicleId = selectedSubject.vehicleId;
    let cancelled = false;

    async function loadPriorReports() {
      try {
        const response = await fetchInspectionReports(
          authToken,
          `?vehicleId=${vehicleId}`,
        );
        if (!cancelled)
          setPriorReports(
            unwrapArray<ApiInspectionReport>(response, ["inspectionReports"]),
          );
      } catch {
        if (!cancelled) setPriorReports([]);
      }
    }

    void loadPriorReports();
    return () => {
      cancelled = true;
    };
  }, [token, selectedSubject?.vehicleId]);

  // Load services for the inspection checklist. Booked customers show
  // catalogue services from their chosen category; walk-ins (no category)
  // show all active services grouped by category so the SA can pick from
  // anything the workshop offers. Falls back to a generic seed checklist
  // when no catalogue services are available at all.
  useEffect(() => {
    if (!token) return;
    const authToken = token;
    const category = selectedSubject?.serviceCategory?.trim();

    let cancelled = false;

    async function loadServices() {
      try {
        const services = category
          ? await fetchWorkshopServicesByCategory(authToken, category)
          : await fetchWorkshopActiveServices(authToken);

        if (cancelled) return;
        const rows: ServiceRow[] = services
          .filter((service) => service?.name)
          .map((service) => ({
            id: crypto.randomUUID(),
            serviceId: service._id || service.id,
            name: service.name as string,
            category: service.category || category || "",
            price: service.basePrice ?? service.price ?? 0,
            selected: false,
          }));

        if (rows.length) {
          // Walk-in: sort by category so services group together
          const sorted = category ? rows : rows.sort((a, b) => a.category.localeCompare(b.category));
          setServiceRows(sorted);
          setItems([]);
        } else {
          setServiceRows([]);
          setItems(seedItems());
        }
        setSubmitted(false);
      } catch {
        if (!cancelled) {
          setServiceRows([]);
          setItems(seedItems());
        }
      }
    }

    void loadServices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, subjectKey, selectedSubject?.serviceCategory]);

  const priorPhotos = useMemo(
    () => priorReports.flatMap((report) => report.photos || []),
    [priorReports],
  );

  function updateItem(id: string, patch: Partial<InspectionItemRow>) {
    setSubmitted(false);
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function setStatus(id: string, status: InspectionItemStatus) {
    setSubmitted(false);
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? status === "ok"
            ? { ...item, laborCost: 0, partsCost: 0, status }
            : { ...item, status }
          : item,
      ),
    );
  }

  const repairItems = useMemo(
    () => items.filter((item) => item.status === "repair"),
    [items],
  );
  const monitorCount = items.filter((item) => item.status === "monitor").length;
  const totalEstimate = repairItems.reduce(
    (sum, item) => sum + item.laborCost + item.partsCost,
    0,
  );

  // Service-selection mode is active whenever the booked category yielded
  // catalogue services to tick; otherwise the generic checklist is shown.
  const servicesMode = serviceRows.length > 0;

  const categoryOptions = useMemo(() => {
    const cats = [...new Set(serviceRows.map((r) => r.category).filter(Boolean))];
    return cats.sort((a, b) => a.localeCompare(b));
  }, [serviceRows]);

  const filteredServiceRows = useMemo(
    () =>
      categoryFilter && categoryFilter !== "All"
        ? serviceRows.filter((r) => r.category === categoryFilter)
        : serviceRows,
    [serviceRows, categoryFilter],
  );

  const selectedServices = useMemo(
    () => serviceRows.filter((row) => row.selected),
    [serviceRows],
  );
  const selectedTotal = selectedServices.reduce(
    (sum, row) => sum + row.price,
    0,
  );

  function toggleService(id: string, selected: boolean) {
    setSubmitted(false);
    setServiceRows((current) =>
      current.map((row) => (row.id === id ? { ...row, selected } : row)),
    );
  }

  async function submitInspection() {
    if (!token || !selectedSubject) {
      showError("Select a repair order to inspect first.");
      return;
    }

    const category = selectedSubject.serviceCategory || "";

    // Build the report payload differently per mode. In service-selection mode
    // the ticked services are what carry to the quote; in the generic checklist
    // mode it's the "Needs repair" items.
    let reportItems: ReturnType<typeof buildReportItem>[];
    let recommendedServices: {
      serviceId?: string;
      name: string;
      price?: number;
      isRequired?: boolean;
    }[];
    let estimatedCost: number;

    if (servicesMode) {
      if (!selectedServices.length) {
        showError(
          "Tick at least one service the vehicle needs before submitting.",
        );
        return;
      }
      reportItems = serviceRows.map((row) =>
        buildReportItem({
          category,
          label: row.name,
          status: row.selected ? "repair" : "ok",
          partsCost: row.selected ? row.price : 0,
        }),
      );
      recommendedServices = selectedServices.map((row) => ({
        serviceId: row.serviceId,
        name: row.name,
        price: row.price,
        isRequired: true,
      }));
      estimatedCost = selectedTotal;
    } else {
      const uncosted = repairItems.filter(
        (item) => item.laborCost + item.partsCost <= 0 && !item.note.trim(),
      );
      if (uncosted.length) {
        showError(
          `Add a cost estimate or a note for "${uncosted[0].label}" — items marked "Needs repair" carry over to the quote and need something for the SA to price.`,
        );
        return;
      }
      reportItems = items.map((item) =>
        buildReportItem({
          category: item.category,
          label: item.label,
          laborCost: item.laborCost,
          note: item.note,
          partsCost: item.partsCost,
          status: item.status,
        }),
      );
      // Items flagged "Needs repair" become the suggested lines the quotation
      // step offers to add with one click.
      recommendedServices = repairItems.map((item) => ({
        name: item.label,
        price: item.laborCost + item.partsCost,
      }));
      estimatedCost = totalEstimate;
    }

    setSaving(true);
    clearApiMessage();
    try {
      await createInspectionReport(token, {
        repairOrderId: selectedSubject.value,
        estimatedCost,
        findings,
        fuelLevel,
        items: reportItems,
        recommendedServices,
        odometer: Number(odometer) || undefined,
        photos: photoFiles
          .map((file) => file.originFileObj as File)
          .filter(Boolean),
      });
      setSubmitted(true);
      // The quote is what turns these findings into priced line items —
      // continue straight there instead of leaving the SA on a "submitted"
      // dead end.
      navigate(`/advisor/quotation?orderId=${selectedSubject.value}`);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Unable to submit the inspection report. Check the API connection.",
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnsType<InspectionItemRow> = [
    {
      key: "item",
      render: (_, item) => (
        <div>
          <div
            style={{
              color: advisorPalette.textMuted,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {item.category}
          </div>
          <div
            style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 2 }}
          >
            {item.label}
          </div>
        </div>
      ),
      title: "Item",
      width: 220,
    },
    {
      key: "status",
      render: (_, item) => (
        <div className="flex flex-wrap gap-2">
          {(["ok", "monitor", "repair"] as InspectionItemStatus[]).map(
            (status) => (
              <Tag
                color={
                  item.status === status ? statusColors[status] : undefined
                }
                key={status}
                onClick={() => setStatus(item.id, status)}
                style={{ cursor: "pointer" }}
              >
                {statusLabels[status]}
              </Tag>
            ),
          )}
        </div>
      ),
      title: "Status",
      width: 220,
    },
    {
      key: "note",
      render: (_, item) =>
        item.status !== "ok" ? (
          <Input
            onChange={(event) =>
              updateItem(item.id, { note: event.target.value })
            }
            placeholder="Condition / recommendation"
            value={item.note}
          />
        ) : (
          <span style={{ color: advisorPalette.textMuted }}>—</span>
        ),
      title: "Note",
    },
    {
      key: "laborCost",
      render: (_, item) =>
        item.status === "repair" ? (
          <InputNumber
            min={0}
            onChange={(value) =>
              updateItem(item.id, {
                laborCost: Math.max(0, Number(value) || 0),
              })
            }
            style={{ width: "100%" }}
            value={item.laborCost}
          />
        ) : (
          <span style={{ color: advisorPalette.textMuted }}>—</span>
        ),
      title: "Labor",
      width: 130,
    },
    {
      key: "partsCost",
      render: (_, item) =>
        item.status === "repair" ? (
          <InputNumber
            min={0}
            onChange={(value) =>
              updateItem(item.id, {
                partsCost: Math.max(0, Number(value) || 0),
              })
            }
            style={{ width: "100%" }}
            value={item.partsCost}
          />
        ) : (
          <span style={{ color: advisorPalette.textMuted }}>—</span>
        ),
      title: "Parts",
      width: 130,
    },
  ];

  const serviceColumns: ColumnsType<ServiceRow> = [
    {
      key: "select",
      render: (_, row) => (
        <Checkbox
          checked={row.selected}
          onChange={(event) => toggleService(row.id, event.target.checked)}
        />
      ),
      title: "Select",
      width: 80,
    },
    {
      key: "service",
      render: (_, row) => (
        <div>
          <div
            style={{
              color: advisorPalette.textMuted,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {row.category || selectedSubject?.serviceCategory}
          </div>
          <div
            style={{ color: advisorPalette.ink, fontWeight: 700, marginTop: 2 }}
          >
            {row.name}
          </div>
        </div>
      ),
      title: "Service",
    },
    {
      key: "price",
      align: "right",
      render: (_, row) => (
        <span style={{ color: advisorPalette.ink, fontWeight: 700 }}>
          {formatMoney(row.price)}
        </span>
      ),
      title: "Price",
      width: 160,
    },
  ];

  return (
    <ServiceAdvisorShell title="Vehicle inspection">
      {apiMessage ? (
        <InlineBanner tone="error">{apiMessage}</InlineBanner>
      ) : null}

      <Card
        bordered={false}
        className="bo-card-hover bo-enter rounded-2xl"
        style={{
          background: advisorPalette.panel,
          boxShadow: advisorPalette.shadow,
          border: `1px solid ${advisorPalette.border}`,
        }}
        title="Inspection subject"
      >
        <div className="flex flex-wrap items-end gap-4">
          <div style={{ minWidth: 340 }}>
            <div
              style={{
                color: advisorPalette.textMuted,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Repair order
            </div>
            <Select
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={setSubjectKey}
              options={subjectOptions.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              placeholder="Select a repair order awaiting inspection..."
              showSearch
              style={{ width: "100%" }}
              value={subjectKey || undefined}
            />
          </div>
          <div>
            <div
              style={{
                color: advisorPalette.textMuted,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Odometer (km)
            </div>
            <InputNumber
              min={0}
              onChange={(value) =>
                setOdometer(value == null ? "" : String(value))
              }
              placeholder="e.g. 45200"
              style={{ width: 160 }}
              value={odometer ? Number(odometer) : undefined}
            />
          </div>
          <div>
            <div
              style={{
                color: advisorPalette.textMuted,
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
                textTransform: "uppercase",
              }}
            >
              Fuel level
            </div>
            <Select
              onChange={setFuelLevel}
              options={fuelLevels.map((level) => ({
                label: level,
                value: level,
              }))}
              style={{ width: 140 }}
              value={fuelLevel}
            />
          </div>
          {selectedSubject?.serviceCategory ? (
            <div>
              <div
                style={{
                  color: advisorPalette.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Booked service
              </div>
              <Tag color="blue">{selectedSubject.serviceCategory}</Tag>
            </div>
          ) : null}
          {submitted ? (
            <Tag color="green" icon={<CheckCircleFilled />}>
              Submitted
            </Tag>
          ) : null}
        </div>
      </Card>

      {!selectedSubject ? (
        <Card
          bordered={false}
          className="bo-card-hover bo-enter rounded-2xl"
          style={{
            background: advisorPalette.panel,
            boxShadow: advisorPalette.shadow,
            border: `1px solid ${advisorPalette.border}`,
          }}
        >
          <Empty description="Select a repair order above to start its inspection checklist." />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {servicesMode ? (
              <>
                <StatCard
                  label="Services selected"
                  palette={advisorPalette}
                  value={selectedServices.length}
                />
                <StatCard
                  label="Available services"
                  palette={advisorPalette}
                  value={serviceRows.length}
                />
                <StatCard
                  label="Estimated cost"
                  palette={advisorPalette}
                  value={formatMoney(selectedTotal)}
                />
              </>
            ) : (
              <>
                <StatCard
                  label="Needs repair"
                  palette={advisorPalette}
                  value={repairItems.length}
                />
                <StatCard
                  label="To monitor"
                  palette={advisorPalette}
                  value={monitorCount}
                />
                <StatCard
                  label="Estimated cost"
                  palette={advisorPalette}
                  value={formatMoney(totalEstimate)}
                />
              </>
            )}
          </div>

          {priorPhotos.length ? (
            <Card
              bordered={false}
              className="bo-card-hover bo-enter rounded-2xl"
              style={{
                background: advisorPalette.panel,
                boxShadow: advisorPalette.shadow,
                border: `1px solid ${advisorPalette.border}`,
              }}
              title="Prior inspection photos for this vehicle"
            >
              <Image.PreviewGroup>
                <div className="flex flex-wrap gap-3">
                  {priorPhotos.map((photo, index) => (
                    <Image
                      alt={`Prior inspection photo ${index + 1}`}
                      key={photo}
                      src={resolveApiAssetUrl(photo)}
                      style={{ borderRadius: 12, objectFit: "cover" }}
                      height={84}
                      width={84}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            </Card>
          ) : null}

          <div className="grid items-start gap-5 *:min-w-0 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Inspection checklist"
              >
                {servicesMode ? (
                  <>
                    <p
                      style={{
                        color: advisorPalette.textMuted,
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      {selectedSubject?.serviceCategory
                        ? `Tick the services this vehicle needs from the ${selectedSubject.serviceCategory} category — the selected services and their prices carry over to the quote.`
                        : "Tick the services this vehicle needs from any category — the selected services and their prices carry over to the quote."}
                    </p>
                    {!selectedSubject?.serviceCategory && categoryOptions.length > 1 ? (
                      <div style={{ marginBottom: 12 }}>
                        <Select
                          allowClear
                          onChange={(value) => setCategoryFilter(value || "")}
                          placeholder="Filter by category"
                          style={{ width: 240 }}
                          value={categoryFilter || undefined}
                        >
                          {categoryOptions.map((cat) => (
                            <Select.Option key={cat} value={cat}>
                              {cat}
                            </Select.Option>
                          ))}
                        </Select>
                      </div>
                    ) : null}
                    <Table
                      columns={serviceColumns}
                      dataSource={filteredServiceRows}
                      pagination={false}
                      rowKey="id"
                      scroll={{ x: 480 }}
                      size="small"
                    />
                  </>
                ) : (
                  <Table
                    columns={columns}
                    dataSource={items}
                    pagination={false}
                    rowKey="id"
                    scroll={{ x: 820 }}
                    size="small"
                  />
                )}
              </Card>
            </div>

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
                <p
                  style={{
                    color: "#ffb4ab",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Inspection summary
                </p>
                {servicesMode ? (
                  <>
                    <div
                      className="mt-4 flex flex-col gap-3"
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}
                    >
                      <div className="flex items-center justify-between">
                        <span>Available services</span>
                        <span style={{ fontWeight: 700 }}>
                          {serviceRows.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Selected</span>
                        <span style={{ color: "#ffb4ab", fontWeight: 700 }}>
                          {selectedServices.length}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        marginTop: 16,
                        paddingTop: 16,
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Selected services
                      </p>
                      {selectedServices.length ? (
                        <div
                          className="mt-3 flex flex-col gap-2"
                          style={{
                            color: "rgba(255,255,255,0.85)",
                            fontSize: 13,
                          }}
                        >
                          {selectedServices.map((row) => (
                            <div
                              className="flex items-start justify-between gap-3"
                              key={row.id}
                            >
                              <span>{row.name}</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatMoney(row.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 13,
                            marginTop: 8,
                          }}
                        >
                          No services selected yet.
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        marginTop: 16,
                        paddingTop: 16,
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Estimated cost
                      </p>
                      <p
                        style={{
                          color: "#ffb4ab",
                          fontSize: 26,
                          fontWeight: 700,
                          marginTop: 8,
                        }}
                      >
                        {formatMoney(selectedTotal)}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="mt-4 flex flex-col gap-3"
                      style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}
                    >
                      <div className="flex items-center justify-between">
                        <span>Total items</span>
                        <span style={{ fontWeight: 700 }}>{items.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Needs repair</span>
                        <span style={{ color: "#ffb4ab", fontWeight: 700 }}>
                          {repairItems.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>To monitor</span>
                        <span style={{ fontWeight: 700 }}>{monitorCount}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        marginTop: 16,
                        paddingTop: 16,
                      }}
                    >
                      <p
                        style={{
                          color: "rgba(255,255,255,0.55)",
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        Estimated cost
                      </p>
                      <p
                        style={{
                          color: "#ffb4ab",
                          fontSize: 26,
                          fontWeight: 700,
                          marginTop: 8,
                        }}
                      >
                        {formatMoney(totalEstimate)}
                      </p>
                    </div>
                  </>
                )}
              </Card>

              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Photos"
              >
                <Upload
                  beforeUpload={() => false}
                  fileList={photoFiles}
                  listType="picture-card"
                  onChange={({ fileList }) => setPhotoFiles(fileList)}
                  onPreview={async (file) => {
                    const src =
                      file.url ||
                      file.preview ||
                      (file.originFileObj
                        ? await fileToDataUrl(file.originFileObj as File)
                        : "");
                    if (!src) return;
                    setPreviewImage(src);
                    setPreviewOpen(true);
                  }}
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
                {previewImage ? (
                  <Image
                    style={{ display: "none" }}
                    src={previewImage}
                    preview={{
                      visible: previewOpen,
                      onVisibleChange: setPreviewOpen,
                    }}
                  />
                ) : null}
              </Card>

              <Card
                bordered={false}
                className="bo-card-hover bo-enter rounded-2xl"
                style={{
                  background: advisorPalette.panel,
                  boxShadow: advisorPalette.shadow,
                  border: `1px solid ${advisorPalette.border}`,
                }}
                title="Findings"
              >
                <TextArea
                  onChange={(event) => setFindings(event.target.value)}
                  placeholder="Overall assessment of the vehicle's condition..."
                  rows={4}
                  value={findings}
                />
                <Button
                  block
                  icon={<UploadOutlined />}
                  loading={saving}
                  onClick={submitInspection}
                  style={{ marginTop: 16 }}
                  type="primary"
                >
                  Submit &amp; continue to quotation
                </Button>
                {servicesMode ? (
                  selectedServices.length ? (
                    <p
                      style={{
                        color: advisorPalette.textMuted,
                        fontSize: 12,
                        marginTop: 8,
                        textAlign: "center",
                      }}
                    >
                      {selectedServices.length} service
                      {selectedServices.length === 1 ? "" : "s"} will be
                      suggested on the quote.
                    </p>
                  ) : null
                ) : repairItems.length ? (
                  <p
                    style={{
                      color: advisorPalette.textMuted,
                      fontSize: 12,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    {repairItems.length} item
                    {repairItems.length === 1 ? "" : "s"} marked "Needs repair"
                    will be suggested on the quote.
                  </p>
                ) : null}
              </Card>
            </div>
          </div>
        </>
      )}
    </ServiceAdvisorShell>
  );
}
