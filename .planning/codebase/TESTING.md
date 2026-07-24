# Testing Patterns

**Analysis Date:** 2026-07-23

**Current state, verified by running the suite:** 36 test files, **235 tests, all passing**, in ~97s. Every test lives in `backend/tests/`. **The frontend has zero tests.**

---

## Test Framework

**Runner:**
- Vitest 4.1.10 — `backend/package.json` devDependency
- Config: `backend/vitest.config.js`
- Environment: `node`, `globals: false` (imports are explicit), `fileParallelism: false` (files run serially — each spins up its own in-memory MongoDB)
- Timeouts: `hookTimeout: 60000`, `testTimeout: 20000`

**Assertion library:** Vitest's built-in `expect`.

**Database:** `mongodb-memory-server` 11.2.0 — a real MongoDB started in-process. Nothing is stubbed at the Mongoose layer.

**HTTP:** `supertest` 7.2.2 against the app built by `createApp()`. The server is never actually listened on.

**Coverage provider:** `@vitest/coverage-v8`, reporters `text` + `html`, scoped to `src/services/**`, `src/controllers/**`, `src/routes/**` (see `backend/vitest.config.js`). `src/repositories`, `src/models`, `src/middlewares`, `src/utils`, and `src/validators` are excluded from the coverage report.

**Run commands** (all from `backend/`):

```bash
npm test                                          # vitest run — full suite, ~97s
npm run test:watch                                # vitest — watch mode
npm run test:coverage                             # vitest run --coverage
npx vitest run tests/unit/reception.service.test.js   # single file, ~16s
npx vitest run -t "rejects a duplicate email"     # single test by name
```

No CI workflow exists (no `.github/`), so the suite runs on demand only.

---

## Test File Organization

**Location:** separate `backend/tests/` tree, never co-located with source.

```
backend/tests/
├── setup.js                  # global lifecycle (mongodb-memory-server, env, per-test cleanup)
├── factories.js              # createUser / tokenFor / authHeader
├── unit/                     # 18 files — service layer, called directly
│   └── <domain>.service.test.js
└── integration/              # 18 files — HTTP layer via supertest
    └── <domain>.routes.test.js
```

**Naming:** the test file name mirrors the source file it targets — `tests/unit/reception.service.test.js` ↔ `src/services/reception.service.js`; `tests/integration/reception.routes.test.js` ↔ `src/routes/reception.routes.js`.

**Rule for new code:** a new backend domain gets both a `tests/unit/<domain>.service.test.js` and a `tests/integration/<domain>.routes.test.js`.

---

## Global Setup

`backend/tests/setup.js` is loaded via `setupFiles` and does three things:

```js
// 1. Env vars set BEFORE any src module (config/env.js calls required()) is imported.
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gms-test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// 2. One MongoMemoryServer per test file.
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60000);

afterAll(async () => { await mongoose.disconnect(); if (mongod) await mongod.stop(); });

// 3. Every collection wiped between tests — full isolation, no shared fixtures.
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) await collections[key].deleteMany({});
});
```

Consequences you must design around:
- Tests **cannot** rely on data created by a previous `it()` in the same file. Each test builds its own world.
- No SMTP/Cloudinary env vars are set, so `getTransporter()` in `backend/src/utils/mailer.js` returns `null` and email is a silent no-op. `sendInvoiceToCustomer` therefore exercises the DB/notification path but never the mail path.
- MongoDB binary download happens on first run; the ~12–17s per-file `setup` cost is `MongoMemoryServer.create()`.

---

## Test Structure

**Unit test** — imports the service namespace and calls functions directly. From `backend/tests/unit/reception.service.test.js`:

```js
import { describe, it, expect } from "vitest";
import * as receptionService from "../../src/services/reception.service.js";
import { RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

const VEHICLE_DETAILS = { model: "Honda Wave", vin: "1HGCM82633A004352", engineNo: "EN12345", mileage: "1000" };

describe("reception.service", () => {
  it("creates a walk-in reception with a repair order shell", async () => {
    const { user: advisor } = await createUser({ role: "serviceAdvisor" });
    const result = await receptionService.createReception(
      { customerName: "Walk-in Customer", phone: "0933333333", plate: "51K-11111", ...VEHICLE_DETAILS },
      advisor._id.toString(),
    );
    expect(result.repairOrder.status).toBe("pending");
    expect(result.booking).toBeNull();
  });
});
```

**Integration test** — builds the app once at module scope, drives it with supertest. From `backend/tests/integration/tracking.routes.test.js`:

```js
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { VehicleModel, RepairOrderModel } from "../../src/models/index.js";
import { createUser } from "../factories.js";

const app = createApp();

describe("Tracking API (public)", () => {
  it("GET /api/tracking works without auth and returns live status", async () => {
    const { user: customer } = await createUser({ phone: "0977777777" });
    const vehicle = await VehicleModel.create({ licensePlate: "51K-99999", customerId: customer._id });
    await RepairOrderModel.create({ vehicleId: vehicle._id, services: [], totalCost: 0, status: "inProgress" });

    const res = await request(app).get("/api/tracking").query({ plate: "51K-99999", phone: "0977777777" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("inProgress");
  });
});
```

**Conventions:**
- `describe` label is the service name for unit tests (`"reception.service"`), the API name for integration tests (`"Tracking API (public)"`, `"Invoice API"`).
- `it` labels are behavioural sentences, and negative cases start with `"rejects ..."`. Regression tests say so explicitly: `"GET /api/repair-orders/:id/status returns a clean 400 for a malformed id (regression)"`.
- Nested `describe` blocks group by function in the large unit files (`auth.service.test.js` groups `register` / `login` / `getMe` / `createStaff` / `updateMe` / `deleteMe` / OTP flow; `repair-order.service.test.js` and `booking.service.test.js` do the same).
- Setup helpers are plain module-scope `async function`s at the top of the file, e.g. `completedOrder(customer, basePrice)` in `backend/tests/integration/invoice.routes.test.js` and `assignedOrder(technician, advisor)` in `backend/tests/unit/transfer-request.service.test.js`.
- Only **one** file uses `beforeEach` for shared arrangement (`backend/tests/unit/transfer-request.service.test.js`, creating a per-test advisor). Everything else arranges inside the `it`.
- Unique-key collisions are dodged with `` `PL-${Date.now()}-${Math.random()}` `` for license plates.

---

## Mocking

**There is no mocking.** Zero uses of `vi.mock`, `vi.fn`, or `vi.spyOn` anywhere in `backend/tests/`. `vitest` is imported only for `describe`, `it`, `expect` (and `beforeEach` in one file).

**What that means in practice:**
- The DB is real (in-memory MongoDB), so Mongoose validation, unique indexes, `populate`, and aggregations are genuinely exercised.
- Time is real — future dates are hardcoded far out (`bookingDate: "2027-02-01"`) rather than faked. **These tests will start failing in 2027.**
- The payment gateway is already a mock in production code (`backend/src/utils/paymentGateway.js`), so payment tests hit the fake without stubbing.
- Email is inert because SMTP env vars are unset, not because it is mocked.
- Cloudinary uploads are simply never invoked by a test.

**If you add mocking**, keep it to genuinely external I/O (Cloudinary, SMTP) — do not start stubbing repositories, that would undercut the value the current suite provides.

---

## Fixtures and Factories

`backend/tests/factories.js` is the only shared fixture module:

```js
export async function createUser(overrides = {}) { /* → { user, password } */ }
export function tokenFor(user) { return signAccessToken({ sub: user._id.toString(), role: user.role }); }
export function authHeader(user) { return { Authorization: `Bearer ${tokenFor(user)}` }; }
```

- `createUser` defaults to `role: "onlineCustomer"`, `accountType: "registered"`, password `"password123"`, and generates unique email/phone from a `Date.now()`+counter. Override anything: `createUser({ role: "serviceAdvisor" })`.
- It returns `{ user, password }` so login tests can use the plaintext password.
- `authHeader(user)` is the standard way to authenticate a supertest request: `.set(authHeader(advisor))`.
- There is **no** vehicle / repair-order / invoice factory. Those are created inline with `VehicleModel.create(...)` / `RepairOrderModel.create(...)` or via a local helper in the test file. Adding shared factories for the RepairOrder spine would remove a lot of duplication.

---

## What the Tests Cover

### Unit tests (`backend/tests/unit/`) — 18 files, 169 tests

| File | Tests | Covers |
|------|-------|--------|
| `auth.service.test.js` | 28 | register (validation + duplicate 409 + 8-char boundary), login (wrong password, deactivated 403, non-login role, no account probing), `getMe`, `createStaff` role allowlist, `updateMe` (name/email/password change), `deleteMe` deactivation, full forgot-password → OTP → reset round trip, OTP consumption, email-verification marking |
| `repair-order.service.test.js` | 22 | create with server-computed `totalCost`, status transitions + `startedAt`, technician reassignment notification, step-line progress rolling up to `completed`, delete guarded to `pending`, step notes (attribution, empty rejection, delete by index), malformed-id 400 regression, quality check pass/fail → `reworkRequired`, `forwardToAccountant` idempotency guard, customer-scoped listing |
| `booking.service.test.js` | 15 | slot listing/capacity, past + malformed date rejection, seat claiming, slot-at-capacity rejection, confirm/cancel/reschedule, ownership check on cancel, status-transition validation, `resolveCustomer`/`resolveVehicle` dedupe by phone/plate |
| `service.service.test.js` | 14 | service categories (create/list/update/delete, empty name, case-insensitive duplicate, 400 vs 404 on ids), services (basePrice required/non-negative, unknown category, category+isActive filters, update/delete) |
| `vehicle.service.test.js` | 9 | `exists` lookup, empty/missing plate, self-service ownership, year range, staff-supplied `customerId` validation, duplicate plate 409 |
| `quotation.service.test.js` | 9 | fields pulled from the repair order rather than the body, empty lines / missing `repairOrderId`, sent quote is immutable, approval syncs services onto the order, rejection leaves order untouched, walk-in direct-confirm path, re-confirm guard, scoping by `repairOrderId` |
| `invoice.service.test.js` | 8 | generate from completed order, non-completed rejection, duplicate-invoice rejection, discount range validation, customer-scoped `listMyInvoices`, `sendInvoiceToCustomer` sets `sentAt`, malformed id |
| `admin.service.test.js` | 8 | `getStatsSummary` zero-filling, `getDailyIntake` day clamping, revenue date-range validation, revenue total from a succeeded payment, role-scoped `listUsers`, invalid role filter, self-deactivation guard |
| `transfer-request.service.test.js` | 7 | assigned-technician-only requests, duplicate pending guard, approve reassigns, reject leaves technician, already-resolved guard, status filter |
| `schedule.service.test.js` | 7 | auto-create on first read, peer-schedule 403, missing `technicianId`, SA updates availability, empty-body rejection, toggle by `scheduleId`, non-boolean `isAvailable` |
| `review.service.test.js` | 7 | review own completed order, rating range, non-completed order, other user's order, duplicate 409, average rating per technician, caller-scoped `myReviews` |
| `payment.service.test.js` | 7 | successful payment settles invoice, invalid `invoiceId`, unsupported method, already-paid / cancelled invoice guards, `getPayment` with invoice summary, 404 |
| `notification.service.test.js` | 7 | `isRead` filter + limit clamping, unread count, owner-scoped `markRead`, `markAllRead`, `clearReadNotifications`, owner-scoped delete |
| `tracking.service.test.js` | 6 | missing plate, plate without phone/orderId, plate+phone lookup, mismatched phone, plate+orderId lookup, orderId/plate mismatch |
| `reception.service.test.js` | 6 | walk-in creates repair-order shell, missing name/phone, booking→order linking, re-reception 409, `getReceptionHistory` hit and miss |
| `additional-service.service.test.js` | 5 | technician proposal + advisor notification, missing `serviceName`, approval pushes a priced line item, second-decision guard, `repairOrderId` scoping |
| `inspection-report.service.test.js` | 4 | neither bookingId nor repairOrderId, report linked to order + vehicle mileage update, malformed bookingId, `repairOrderId` filter |
| `advisor.service.test.js` | 2 | dashboard counters on empty system and with real data |

### Integration tests (`backend/tests/integration/`) — 18 files, 66 tests

These verify what unit tests cannot: routing, `requireAuth`/`requireRole`, `catchAsync` + `errorHandler` status mapping, and the JSON body shape the frontend consumes.

| File | Tests | Notable coverage |
|------|-------|------------------|
| `auth.routes.test.js` | 9 | register 201 + token, short-password 400 through `validateBody`, login → `GET /me`, missing-token 401, `POST /auth/staff` 403 for SA / 201 for admin, `PUT /me`, `DELETE /me`, forgot→reset round trip |
| `service.routes.test.js` | 6 | public categories, admin-only create, duplicate 409, create + public listing, malformed id 400, admin update/delete |
| `booking.routes.test.js` | 5 | public slots + public create, staff-only listing, staff confirm end-to-end, customer self-cancel |
| `admin.routes.test.js` | 4 | auth requirement, admin summary figures, technician caller restricted to technicians, self-deactivation rejection |
| `repair-order.routes.test.js` | 4 | server-computed `totalCost`, malformed-id 400 regression, full technician progress lifecycle, QC + forward-to-accountant |
| `vehicle.routes.test.js` | 4 | staff-auth requirement on `exists`, customer self-service create, `exists` after create, duplicate plate 409 |
| `payment.routes.test.js` | 3 | payment settles invoice, unsupported method, fetch by id |
| `invoice.routes.test.js` | 3 | accountant generates from completed order (status `unpaid`), `/mine` customer scoping, `PATCH /:id/send` sets `sentAt` |
| `notification.routes.test.js` | 3 | caller-scoped list, owner-scoped mark-read (404 for others), read-all |
| `reception.routes.test.js` | 3 | SA receives walk-in, missing name/phone, history suggestions by plate |
| `schedule.routes.test.js` | 3 | auto-create on read, availability patch, peer-schedule 403 |
| `review.routes.test.js` | 3 | submit for own completed order, `/mine` scoping, rating range |
| `inspection-report.routes.test.js` | 3 | JSON create (**explicitly "no photos"**), missing-linkage rejection, `repairOrderId` filter |
| `tracking.routes.test.js` | 3 | public unauthenticated lookup, missing plate 400, wrong phone 404 (no account probing) |
| `quotation.routes.test.js` | 2 | SA create → send → confirm updating the order, editing a sent quote rejected |
| `transfer-request.routes.test.js` | 2 | technician request → SA approve → reassignment, unassigned-technician rejection |
| `additional-service.routes.test.js` | 2 | technician proposes → SA sends → approves → line item on order, technician-only endpoint guard |
| `advisor.routes.test.js` | 2 | dashboard 403 for customer, 200 counters for SA |

**Cross-role workflow chains are covered end-to-end** in `additional-service.routes.test.js`, `transfer-request.routes.test.js`, `quotation.routes.test.js`, and `repair-order.routes.test.js` — these are the highest-value tests in the suite.

---

## What the Tests Do NOT Cover

### Frontend: nothing at all

- No test runner is configured. `frontend/package.json` scripts are only `dev`, `build`, `preview` — there is no `test` script and no `vitest`/`jest`/`@testing-library/*` dependency.
- No `*.test.*` or `*.spec.*` file exists anywhere under `frontend/`.
- `playwright@^1.61.1` is listed as a devDependency but is **entirely unused** — no `playwright.config.*`, no spec files, no script. It is dead weight; either wire up E2E or remove it.
- ~21,400 lines across 148 `.ts`/`.tsx` files are unverified, including 700–1,300-line page components (`frontend/src/pages/advisor/QuotationPage.tsx` 1,263 lines, `VehicleInspectionPage.tsx` 1,201, `VehicleReceptionPage.tsx` 1,030, `frontend/src/pages/technician/TechnicianRepairNotesPage.tsx` 833).
- Pure, trivially testable logic sits untested: `frontend/src/pages/customer/tracking/lib/mapTrackingRecord.ts`, `frontend/src/shared/lib/api-client.ts` (error parsing, FormData Content-Type handling), `frontend/src/shared/auth/storage.ts` and `routes.ts`, `frontend/src/shared/lib/csv-export.ts` / `pdf-export.ts`.
- With `strict` off in `frontend/tsconfig.json`, the type checker is not compensating for the absent tests either.

### Backend modules with no test file

| Untested | Path |
|----------|------|
| Parts catalog service (5 exported functions) | `backend/src/services/part.service.js` |
| Parts routes | `backend/src/routes/part.routes.js` (`/api/admin/parts`) |
| Audit-log service | `backend/src/services/audit-log.service.js` |
| Audit-log routes | `backend/src/routes/audit-log.routes.js` (`/api/audit-logs`) |

Both are recent additions (Parts catalog backend, billing Audit Trail) and both are visible in the admin/accountant UI.

### Backend layers excluded from coverage and untested directly

- `backend/src/middlewares/` — `requireAuth`/`requireRole` are exercised incidentally through integration tests, but `validate.middleware.js`, `upload.middleware.js` (multer size/mimetype limits), and `logger.middleware.js` have no direct tests. `errorHandler`'s duplicate-key (409) and Mongoose `CastError` (400) branches are only hit accidentally.
- `backend/src/utils/` — no direct tests for `jwt.js`, `password.js`, `otp.js`, `date.js`, `cloudinary.js`, `mailer.js`, `paymentGateway.js`, `notify.js`, `audit.js`. The best-effort swallow-and-warn behaviour of `notify.js`/`audit.js` (a logging failure must not break the business action) is never asserted.
- `backend/src/validators/auth.validator.js` — covered only indirectly via `auth.routes.test.js`; the validator functions are pure and trivially unit-testable but have no test file.
- `backend/src/repositories/base.repository.js` — never tested directly (acceptable; it is a thin wrapper).

### Specific untested behaviours

- **Partial payments.** `backend/src/services/payment.service.js` supports `amount` less than the balance, updating `amountPaid` and setting status `partiallyPaid`. No test mentions `amountPaid`, `balanceDue`, or `partiallyPaid` — only the full-settlement path is asserted.
- **Failed payments.** `charge({ simulate: "fail" })` in `backend/src/utils/paymentGateway.js` exists for exactly this, and no test passes `simulate`. The declined-charge branch is dead in testing.
- **Revenue attribution breakdowns.** `getRevenueReport`'s `byService` / `byTechnician` maps in `backend/src/services/admin.service.js` (the reconciliation logic that was specifically fixed) are never asserted — only `totalRevenue` is. A regression there would ship silently.
- **File uploads.** No test uses supertest's `.attach()`. Inspection photos, service-category images, and the whole Cloudinary path in `backend/src/utils/cloudinary.js` + `upload.middleware.js` are unverified — and `inspection-report.routes.test.js` says "no photos" in its own test name.
- **Email delivery.** SMTP config is absent in tests, so `sendEmail` no-ops. Invoice-send and OTP-email content and failure handling are untested.
- **Concurrency.** Slot capacity is tested sequentially only. There is a manual script `backend/scripts/test-slot-concurrency.js` for the race condition, but it is not part of the suite.
- **Time-dependent logic.** Net-15 invoice due dates (`INVOICE_TERM_DAYS` in `backend/src/services/invoice.service.js`) and overdue detection are not asserted, and no fake timers exist to make that feasible today.
- **Hardcoded future dates.** Booking tests use literal `"2027-02-01"` / `"2027-02-02"` dates that must be in the future. These become failures once real time passes them.

---

## Where to Add Tests

**When adding a backend endpoint:**
1. Unit test the service in `backend/tests/unit/<domain>.service.test.js` — happy path plus every `throw new ApiError(...)` branch, asserted with `.rejects.toMatchObject({ status: 400 })`.
2. Integration test the route in `backend/tests/integration/<domain>.routes.test.js` — at minimum one auth/role rejection and one success asserting the exact response body shape the frontend reads.

**Highest-value gaps to close first:**
1. `part.service` / `part.routes` and `audit-log.service` / `audit-log.routes` — whole features with no coverage.
2. Partial-payment and failed-payment paths in `payment.service` — money handling with branches that never execute in tests.
3. `getRevenueReport` `byService`/`byTechnician` reconciliation in `admin.service` — previously buggy, currently unguarded.
4. A frontend test runner (Vitest + Testing Library) plus tests for `api-client.ts`, `mapTrackingRecord.ts`, and `shared/auth/`.
5. Replace hardcoded `2027-…` booking dates with dates computed relative to `new Date()`.

---

## Common Patterns

**Async error assertion (unit):**

```js
await expect(
  receptionService.createReception({ plate: "51K-22222" }, advisor._id.toString()),
).rejects.toMatchObject({ status: 400 });
```

`toMatchObject({ status })` on the thrown `ApiError` is the standard — assert the status, not the message string (messages change; statuses are the contract).

**HTTP error assertion (integration):**

```js
const res = await request(app).get("/api/advisor/dashboard").set(authHeader(customer));
expect(res.status).toBe(403);
```

Some tests also assert the error body shape: `expect(res.body.error).toBeTypeOf("string")`.

**Authenticated request:**

```js
const { user: admin } = await createUser({ role: "admin" });
const res = await request(app).post("/api/auth/staff").set(authHeader(admin)).send({ ... });
```

**Building a repair-order world** (the spine every downstream test needs) — a local helper at the top of the file:

```js
async function completedOrder(customer, basePrice = 100000) {
  const vehicle = await VehicleModel.create({ licensePlate: `PL-${Date.now()}-${Math.random()}`, customerId: customer._id });
  const svc = await ServiceModel.create({ name: "Service", basePrice, isActive: true });
  return RepairOrderModel.create({
    vehicleId: vehicle._id,
    services: [{ serviceId: svc._id, name: svc.name, priceAtTime: basePrice, quantity: 1 }],
    totalCost: basePrice,
    status: "completed",
  });
}
```

**Asserting a side effect the service performed** — re-read through the model rather than trusting the return value:

```js
await RepairOrderModel.findByIdAndUpdate(created.repairOrder._id, { status: "completed" });
const history = await receptionService.getReceptionHistory("51K-55555");
expect(history.suggestions.length).toBeGreaterThan(0);
```

---

## Related Non-Automated Artifacts

`test/` at the repo root holds manual test-case spreadsheets (`Unit Test Case_GarageManagementSystem_v1.0.xls`, `Integration Test Case_…xls`, `System Test_…xlsx` plus blank templates). That directory is gitignored via the root `.gitignore` (`test/`) and is unrelated to the automated suite — do not confuse it with `backend/tests/`.

`backend/scripts/` contains operational scripts, not tests: `seed.js`, `seed-admin.js`, `backfill-booking-seats.js`, `backfill-invoiced-at.js`, and `test-slot-concurrency.js` (a manual race-condition probe).

---

*Testing analysis: 2026-07-23*
