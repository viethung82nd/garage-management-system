# Database Schema — Garage Management System

MongoDB/Mongoose collections used by `backend/src/models/`. Each collection lists its fields as:

```
+ fieldName: Type (constraints) <Default: value>
```

`ObjectId (ref: X)` means the field stores another document's `_id` and references collection `X`. Sub-documents (arrays of nested objects) are documented directly under the parent field and indented.

## Contents

- Identity & vehicles: [User](#user), [Vehicle](#vehicle)
- Service catalog: [ServiceCategory](#servicecategory), [Service](#service)
- Booking: [Booking](#booking), [BookingHistory](#bookinghistory)
- Repair workflow: [InspectionReport](#inspectionreport), [ServiceQuote](#servicequote), [RepairOrder](#repairorder), [ServiceRequest](#servicerequest-additional-service-proposal), [TransferRequest](#transferrequest)
- Billing: [Invoice](#invoice), [Payment](#payment), [AuditLog](#auditlog)
- Engagement: [Notification](#notification), [Review](#review)
- Reporting: [RevenueReport](#revenuereport)
- Security / ephemeral (excluded from reseeds — see `backend/scripts/seed.js`): [Otp](#otp), [LookupSession](#lookupsession)
- [Schedule](#schedule)

---

## User

Every human in the system — customers, staff, and admin — in one collection, distinguished by `role`.

```
+ _id: ObjectId <Default: auto-generated>
+ fullName: String (required, trim)
+ email: String (unique, sparse, lowercase, trim)
+ phone: String (trim)
+ passwordHash: String — never serialized to JSON (stripped in toJSON transform)
+ lookupCode: String (unique, sparse) — walk-in customers' lookup code instead of a password
+ accountType: String (enum: registered, walkIn) <Default: registered>
+ role: String (required, enum: onlineCustomer, walkInCustomer, serviceAdvisor, technician, accountant, admin)
+ isActive: Boolean <Default: true>
+ isEmailVerified: Boolean <Default: false>
+ createdBy: ObjectId (ref: User) — set when staff/admin creates the account on someone's behalf
+ createdAt: Timestamp <Default: Date.now>
+ updatedAt: Timestamp <Default: Date.now>
```

## Vehicle

```
+ _id: ObjectId <Default: auto-generated>
+ licensePlate: String (required, unique, uppercase, trim)
+ chassisNumber: String (trim)
+ engineNumber: String (trim)
+ customerId: ObjectId (ref: User, required)
+ brand: String (trim)
+ model: String (trim)
+ year: Number
+ color: String (trim)
+ lastKnownMileage: Number (min: 0) — captured at the most recent reception/inspection
+ createdAt: Timestamp <Default: Date.now>
+ updatedAt: Timestamp <Default: Date.now>
```

## ServiceCategory

```
+ _id: ObjectId <Default: auto-generated>
+ name: String (required, unique, trim)
+ description: String (trim)
+ isActive: Boolean <Default: true>
+ imageUrl: String (trim)
+ createdAt: Timestamp <Default: Date.now>
+ updatedAt: Timestamp <Default: Date.now>
```

## Service

Catalog item — what an SA quotes and a repair order's `services[]` lines reference.

```
+ _id: ObjectId <Default: auto-generated>
+ name: String (required, trim)
+ category: String (trim) — matches a ServiceCategory.name, not a foreign key
+ basePrice: Number (required, min: 0)
+ estimatedDuration: Number (min: 0) — minutes
+ isActive: Boolean <Default: true>
+ createdAt: Timestamp <Default: Date.now>
```

## Booking

```
+ _id: ObjectId <Default: auto-generated>
+ customerId: ObjectId (ref: User, required)
+ vehicleId: ObjectId (ref: Vehicle, required)
+ serviceId: ObjectId (ref: Service)
+ advisorId: ObjectId (ref: User)
+ repairOrderId: ObjectId (ref: RepairOrder) — set once reception turns this booking into a repair order
+ bookingDate: Timestamp (required)
+ timeSlot: String (required)
+ source: String (enum: online, walkIn) <Default: online>
+ status: String (enum: pending, confirmed, cancelled, rescheduled, completed) <Default: pending>
+ seatNo: Number (min: 1) — which of the day/slot's capacity seats this booking occupies
+ occupiesSlot: Boolean <Default: true> — kept in sync with status via a pre-save hook; only true while status is pending/confirmed/rescheduled
+ note: String (trim)
+ createdAt: Timestamp <Default: Date.now>
```

Indexes: `{ bookingDate, timeSlot, status }` (read path); unique `{ bookingDate, timeSlot, seatNo }` partial on `occupiesSlot: true` (capacity lock — prevents overbooking a slot).

## BookingHistory

Audit trail of changes to a `Booking` (distinct from `AuditLog`, which is billing-only).

```
+ _id: ObjectId <Default: auto-generated>
+ bookingId: ObjectId (ref: Booking, required)
+ changedBy: ObjectId (ref: User, required)
+ action: String (required, enum: created, confirmed, cancelled, rescheduled, completed)
+ previousDate: Timestamp
+ previousSlot: String
+ reason: String (trim)
+ changedAt: Timestamp <Default: Date.now>
```

## InspectionReport

Either `bookingId` (SA inspection at intake) or `repairOrderId` (technician inspection mid-repair) is set, never both — enforced by the controller.

```
+ _id: ObjectId <Default: auto-generated>
+ bookingId: ObjectId (ref: Booking)
+ repairOrderId: ObjectId (ref: RepairOrder)
+ vehicleId: ObjectId (ref: Vehicle, required)
+ advisorId: ObjectId (ref: User, required)
+ findings: String (trim)
+ estimatedCost: Number (min: 0)
+ odometer: Number (min: 0)
+ fuelLevel: String (trim)
+ items: Array of InspectionItem <Default: []>
    + category: String (trim)
    + label: String (trim)
    + status: String (enum: ok, monitor, repair) <Default: ok>
    + note: String (trim)
    + laborCost: Number (min: 0)
    + partsCost: Number (min: 0)
+ photos: Array of String <Default: []>
+ recommendedServices: Array of RecommendedService <Default: []>
    + serviceId: ObjectId (ref: Service)
    + name: String (required)
    + price: Number (min: 0)
    + isRequired: Boolean <Default: false>
+ status: String (enum: pending, completed) <Default: pending>
+ inspectedAt: Timestamp <Default: Date.now>
```

## ServiceQuote

The SA's price quote to a customer. `confirmQuotation` copies it onto a `RepairOrder` (see `quoteId`/`quotedTotal` there).

```
+ _id: ObjectId <Default: auto-generated>
+ code: String (trim) — human-facing quote number, e.g. "QT-10231"
+ repairOrderId: ObjectId (ref: RepairOrder, required)
+ vehicleId: ObjectId (ref: Vehicle, required)
+ customerId: ObjectId (ref: User)
+ advisorId: ObjectId (ref: User, required)
+ customerName: String (trim) — denormalized snapshot at write time
+ customerPhone: String (trim)
+ vehicleName: String (trim)
+ vehiclePlate: String (trim)
+ lines: Array of QuoteLine <Default: []>
    + serviceId: ObjectId (ref: Service) — unset for a hand-typed custom line
    + description: String (trim)
    + kind: String (enum: service, part, labor) <Default: service>
    + quantity: Number (min: 0) <Default: 1>
    + unitPrice: Number (min: 0) <Default: 0>
+ discountPercent: Number (min: 0, max: 100) <Default: 0>
+ taxPercent: Number (min: 0, max: 100) <Default: 0>
+ totalEstimate: Number (min: 0) — `(Σ unitPrice×qty) × (1 − discountPercent%) × (1 + taxPercent%)`
+ status: String (enum: draft, sent, approved, rejected) <Default: draft>
+ note: String (trim)
+ validUntil: Timestamp
+ createdAt: Timestamp <Default: Date.now>
+ updatedAt: Timestamp <Default: Date.now>
```

## RepairOrder

The central work-order record — created at reception, carried through inspection/quoting/repair/QC/invoicing.

```
+ _id: ObjectId <Default: auto-generated>
+ inspectionId: ObjectId (ref: InspectionReport)
+ vehicleId: ObjectId (ref: Vehicle, required)
+ advisorId: ObjectId (ref: User)
+ technicianId: ObjectId (ref: User)
+ issueDescription: String (trim) — captured at reception
+ promisedAt: Timestamp
+ services: Array of OrderService <Default: []>
    + serviceId: ObjectId (ref: Service) — optional; a quote/additional-service line may not map to a catalog entry
    + name: String (required)
    + priceAtTime: Number (required, min: 0)
    + quantity: Number (min: 1) <Default: 1>
    + kind: String (enum: service, part, labor) <Default: service>
    + source: String (enum: quote, additionalService) <Default: quote>
    + status: String (enum: pending, inProgress, completed) <Default: pending>
+ quoteId: ObjectId (ref: ServiceQuote) — the confirmed quote this order's services[] came from
+ quotedDiscountPercent: Number <Default: 0>
+ quotedTaxPercent: Number <Default: 0>
+ quotedTotal: Number
+ stepNotes: Array of StepNote <Default: []>
    + content: String (required)
    + technicianId: ObjectId (ref: User, required)
    + stepIndex: Number (min: 0) — index into services[] this note is about
    + createdAt: Timestamp <Default: Date.now>
+ status: String (enum: pending, inProgress, completed, reworkRequired, cancelled) <Default: pending>
+ totalCost: Number (min: 0) — raw sum of services[], pre-discount/pre-tax
+ startedAt: Timestamp
+ completedAt: Timestamp
+ forwardedToAccountantAt: Timestamp — set once QC passes and the SA forwards the order for invoicing
```

## ServiceRequest (additional-service proposal)

A technician's request to add work mid-repair (found a problem the original quote didn't cover).

```
+ _id: ObjectId <Default: auto-generated>
+ repairOrderId: ObjectId (ref: RepairOrder, required)
+ technicianId: ObjectId (ref: User, required)
+ serviceId: ObjectId (ref: Service)
+ serviceName: String (trim)
+ affectedPart: String (trim)
+ customerImpact: String (trim)
+ laborCost: Number (min: 0)
+ partsCost: Number (min: 0)
+ estimateMinutes: Number (min: 0)
+ evidenceCount: Number (min: 0) <Default: 0>
+ priority: String (enum: high, medium, low) <Default: medium>
+ reason: String (trim)
+ estimatedPrice: Number (min: 0)
+ status: String (enum: pending, sent, approved, rejected, approvedBySA, rejectedBySA, approvedByCustomer, rejectedByCustomer) <Default: pending>
+ reviewedBy: ObjectId (ref: User)
+ reviewNote: String (trim)
+ resolvedAt: Timestamp
+ createdAt: Timestamp <Default: Date.now>
```

## TransferRequest

Handing a repair order off from one technician to another.

```
+ _id: ObjectId <Default: auto-generated>
+ repairOrderId: ObjectId (ref: RepairOrder, required)
+ fromTechnicianId: ObjectId (ref: User, required)
+ toTechnicianId: ObjectId (ref: User, required)
+ reason: String (trim)
+ status: String (enum: pending, approved, rejected) <Default: pending>
+ resolvedBy: ObjectId (ref: User)
+ resolveNote: String (trim)
+ requestedAt: Timestamp <Default: Date.now>
+ resolvedAt: Timestamp
```

## Invoice

One per completed `RepairOrder` (unique index on `repairOrderId`).

```
+ _id: ObjectId <Default: auto-generated>
+ repairOrderId: ObjectId (ref: RepairOrder, required, unique)
+ accountantId: ObjectId (ref: User)
+ lineItems: Array of LineItem <Default: []>
    + description: String (required)
    + quantity: Number (required, min: 1)
    + unitPrice: Number (required, min: 0)
    + kind: String (enum: service, part, labor) <Default: service>
    + source: String (enum: quote, additionalService) <Default: quote>
+ subtotal: Number (required, min: 0)
+ discount: Number (min: 0) <Default: 0>
+ taxAmount: Number (min: 0) <Default: 0>
+ total: Number (required, min: 0)
+ amountPaid: Number (min: 0) <Default: 0> — running total across payments; supports partial payment
+ status: String (enum: unpaid, partiallyPaid, paid, cancelled) <Default: unpaid>
+ issuedAt: Timestamp <Default: Date.now>
+ dueAt: Timestamp — issuedAt + 15 days (Net-15); "overdue" is derived (unpaid/partiallyPaid + dueAt in the past), not stored
+ sentAt: Timestamp
+ quoteId: ObjectId (ref: ServiceQuote) — snapshot reference to the quote this invoice was generated from
+ quotedTotal: Number — snapshot of the quote's total, for a quoted-vs-actual comparison without an extra join
```

## Payment

One row per payment attempt against an invoice (a partial payment or a retried failure both create new rows).

```
+ _id: ObjectId <Default: auto-generated>
+ invoiceId: ObjectId (ref: Invoice, required)
+ customerId: ObjectId (ref: User, required)
+ amount: Number (required, min: 0)
+ method: String (required, enum: cash, card, bankTransfer, eWallet)
+ gatewayRef: String — internal mock-payment-gateway transaction id
+ reference: String (trim) — accountant-entered bank/e-wallet transaction code, reconciled against a bank statement
+ gatewayPayload: Mixed
+ status: String (enum: pending, succeeded, failed, refunded) <Default: pending>
+ paidAt: Timestamp
```

## AuditLog

Billing-only audit trail (invoice/payment actions), surfaced on the accountant's Audit Trail screen. Distinct from `BookingHistory`.

```
+ _id: ObjectId <Default: auto-generated>
+ action: String (required, enum: invoiceGenerated, invoiceSent, paymentRecorded)
+ actorId: ObjectId (ref: User, required)
+ invoiceId: ObjectId (ref: Invoice)
+ repairOrderId: ObjectId (ref: RepairOrder)
+ details: String
+ createdAt: Timestamp <Default: Date.now>
```

## Notification

```
+ _id: ObjectId <Default: auto-generated>
+ userId: ObjectId (ref: User, required)
+ type: String (required)
+ title: String (required)
+ message: String
+ refId: ObjectId (refPath: refModel) — polymorphic reference
+ refModel: String (enum: Booking, RepairOrder) — selects which collection refId points into
+ isRead: Boolean <Default: false>
+ createdAt: Timestamp <Default: Date.now>
```

## Review

```
+ _id: ObjectId <Default: auto-generated>
+ customerId: ObjectId (ref: User, required)
+ repairOrderId: ObjectId (ref: RepairOrder, required)
+ technicianId: ObjectId (ref: User)
+ rating: Number (required, min: 1, max: 5)
+ comment: String (trim)
+ createdAt: Timestamp <Default: Date.now>
```

Unique index on `{ customerId, repairOrderId }` — one review per customer per repair order.

## RevenueReport

Generated/cached report snapshot (not computed live on every read).

```
+ _id: ObjectId <Default: auto-generated>
+ period: String (required, enum: daily, weekly, monthly, quarterly, yearly)
+ startDate: Timestamp (required)
+ endDate: Timestamp (required)
+ totalRevenue: Number <Default: 0>
+ totalOrders: Number <Default: 0>
+ totalInvoices: Number <Default: 0>
+ byService: Array of ByService <Default: []>
    + serviceId: ObjectId (ref: Service, required)
    + serviceName: String
    + orderCount: Number <Default: 0>
    + revenue: Number <Default: 0>
+ byTechnician: Array of ByTechnician <Default: []>
    + technicianId: ObjectId (ref: User, required)
    + technicianName: String
    + orderCount: Number <Default: 0>
    + completionRate: Number <Default: 0>
    + avgTime: Number <Default: 0>
+ byPaymentMethod: Array of ByPaymentMethod <Default: []>
    + method: String (required)
    + count: Number <Default: 0>
    + amount: Number <Default: 0>
+ generatedBy: ObjectId (ref: User)
+ generatedAt: Timestamp <Default: Date.now>
```

## Otp

Ephemeral security record — excluded from `backend/scripts/seed.js` resets. Self-purges via a TTL index.

```
+ _id: ObjectId <Default: auto-generated>
+ email: String (required, lowercase, trim)
+ codeHash: String (required) — SHA-256 hash only; the raw code is never stored
+ purpose: String (required, enum: passwordReset, emailVerification)
+ attempts: Number <Default: 0>
+ consumedAt: Timestamp — set once the code is spent, preventing reuse
+ expiresAt: Timestamp (required) — TTL index (expireAfterSeconds: 0) auto-deletes expired documents
+ createdAt: Timestamp <Default: Date.now>
```

## LookupSession

Ephemeral security record — excluded from `backend/scripts/seed.js` resets. Backs walk-in customers' code-based lookup instead of a password login. Self-purges via a TTL index.

```
+ _id: ObjectId <Default: auto-generated>
+ customerId: ObjectId (ref: User, required)
+ lookupCode: String (required)
+ sessionToken: String (required, unique)
+ expiredAt: Timestamp (required) — TTL index (expireAfterSeconds: 0)
+ createdAt: Timestamp <Default: Date.now>
```

## Schedule

A technician's per-day availability and workload.

```
+ _id: ObjectId <Default: auto-generated>
+ technicianId: ObjectId (ref: User, required)
+ date: Timestamp (required)
+ isAvailable: Boolean <Default: true>
+ activeOrderIds: Array of Ids (ref: RepairOrder) <Default: []>
+ activeOrderCount: Number (min: 0) <Default: 0>
```

Unique index on `{ technicianId, date }` — one schedule entry per technician per day.
