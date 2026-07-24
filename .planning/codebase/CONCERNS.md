# Codebase Concerns

**Analysis Date:** 2026-07-23

Garage management system: Node/Express/Mongoose backend (`backend/src`), React 19 + TS + Vite frontend (`frontend/src`).
Findings are ranked **High / Medium / Low** by business impact × likelihood, with `file:line` citations.

---

## Severity Index

| # | Severity | Finding | Primary file |
|---|----------|---------|--------------|
| 1 | **High** | Invoice can be generated for an order that never passed Quality Check | `backend/src/services/invoice.service.js:245` |
| 2 | **High** | No MongoDB transactions anywhere — every multi-document write can half-apply | all of `backend/src/services/` |
| 3 | **High** | Customer approval is never captured before extra work is billed | `backend/src/services/additional-service.service.js:163` |
| 4 | **High** | Password-reset / verification OTPs are only `console.log`-ed, never delivered | `backend/src/utils/otp.js:26` |
| 5 | **High** | Deactivated / role-changed users keep a valid JWT for up to 7 days | `backend/src/middlewares/auth.middleware.js:16` |
| 6 | **High** | No rate limiting, no `helmet`, on public auth/booking/tracking endpoints | `backend/src/app.js:10` |
| 7 | **Medium** | Parts catalog is isolated CRUD — `stockQuantity` is never decremented | `backend/src/models/part.model.js:22` |
| 8 | **Medium** | Concurrent payments race on `invoice.amountPaid` (read-modify-write) | `backend/src/services/payment.service.js:87` |
| 9 | **Medium** | `Booking.occupiesSlot` hook is bypassable — a stale seat locks a slot forever | `backend/src/models/booking.model.js:98` |
| 10 | **Medium** | Audit log covers only 3 billing actions; nothing else is auditable | `backend/src/models/audit-log.model.js:3` |
| 11 | **Medium** | Services / service categories are hard-deleted, orphaning live references | `backend/src/services/service.service.js:107,247` |
| 12 | **Medium** | Any staff role can read every repair order (no ownership scoping) | `backend/src/services/repair-order.service.js:31` |
| 13 | **Medium** | Payment gateway is a mock that always succeeds | `backend/src/utils/paymentGateway.js:11` |
| 14 | **Medium** | Cloned WordPress theme JS fights React; 24 MB of vendored theme assets | `frontend/src/widgets/appointment-booking/ui/AppointmentBookingForm.tsx:118` |
| 15 | **Medium** | Invoice `dueAt` exists but nothing ever marks an invoice overdue | `backend/src/models/invoice.model.js:76` |
| 16 | **Low** | `reworkRequired` status is invisible to the public tracking page | `backend/src/services/tracking.service.js:43` |
| 17 | **Low** | Dead mock-data modules still shipped in the frontend bundle | `frontend/src/pages/accountant/model/mock.ts` |
| 18 | **Low** | No linter/formatter config; no frontend tests; no coverage thresholds | `backend/vitest.config.js:14` |
| 19 | **Low** | Test-coverage gaps: Parts, audit log, QC→invoice gate, concurrency | `backend/tests/` |

---

## Tech Debt

### 1. Quality-Check gate does not actually gate invoicing — **High**

**Issue:** A QC pass is a no-op on the order's state.
`submitQualityCheck` requires `status === "completed"` (`backend/src/services/repair-order.service.js:548`), and on `passed === true` it only touches `completedAt` and pushes a `[QC pass]` step note (`repair-order.service.js:555-557`); **the status stays `"completed"`**. There is no `qualityCheckedAt` / `qcPassedBy` field on the schema (`backend/src/models/repair-order.model.js:100-192`).

Meanwhile `generateInvoiceFromRepairOrder` gates on exactly the same value:

```js
// backend/src/services/invoice.service.js:245
if (order.status !== "completed") {
  throw new ApiError(409, "repair order is not completed");
}
```

A technician reaches `"completed"` on their own — either by `PATCH /:id/progress` with an explicit status (`repair-order.service.js:305`) or implicitly once every line is `completed` (`repair-order.service.js:294-295`). So an accountant can invoice an order that no service advisor ever reviewed. `forwardedToAccountantAt` (`repair-order.service.js:619`) is the only signal QC happened, and invoice generation never reads it.

**Files:**
- `backend/src/services/repair-order.service.js:536-592` (`submitQualityCheck`)
- `backend/src/services/repair-order.service.js:601-635` (`forwardToAccountant`)
- `backend/src/services/invoice.service.js:235-312`
- `backend/src/models/repair-order.model.js:162-189`

**Impact:** Un-inspected work gets billed to customers. The QC step is decorative — the only trace of a pass/fail is free text inside `stepNotes`, which nothing queries. A failed QC *is* recorded (status → `reworkRequired`, `repair-order.service.js:559`), so only the pass path is lossy.

**Fix approach:** Add explicit fields to `repairOrderSchema` — `qualityCheckedAt: Date`, `qualityCheckedBy: ObjectId`, `qualityCheckPassed: Boolean`. Set them in `submitQualityCheck`. Change `invoice.service.js:245` to require `order.status === "completed" && order.qualityCheckedAt` (and optionally `forwardedToAccountantAt`). Backfill existing rows by parsing the `[QC pass]` step notes.

---

### 2. No transactions across any multi-document write — **High**

**Issue:** `grep -rn "startSession\|withTransaction" backend/src` returns **zero hits**. Every business action that touches more than one collection is a sequence of independent `save()`s that can half-apply if the process dies, the connection drops, or a validation error fires mid-sequence.

**Files and the specific split-brain each one produces:**

| Flow | File | What can half-apply |
|------|------|---------------------|
| Quote confirm → repair order | `backend/src/services/quotation.service.js:183-224` | `quote.status = "approved"` saved at :184, then order lines/total/`quoteId`/`quotedDiscountPercent` saved at :222. A crash between them leaves an **approved quote whose order has no services and `totalCost` undefined** — and the quote is now terminal (`:179-181` refuses re-confirmation), so it can never be replayed. |
| Additional service approve → order | `backend/src/services/additional-service.service.js:158,178` | Proposal saved `approved` at :158, extra line pushed onto the order at :166-178. Half-apply = approved-but-unbilled extra work, and `TERMINAL_STATUSES` (:16,:133) blocks retry. |
| Invoice generate → order | `backend/src/services/invoice.service.js:283-301` | Invoice created at :283, `order.invoicedAt` set at :300-301. Half-apply = invoice exists but the SA's QC queue never clears it. |
| Payment → invoice | `backend/src/services/payment.service.js:66-90` | Payment row `succeeded` at :83, invoice `amountPaid`/`status` at :87-90. Half-apply = money taken, invoice still `unpaid`. |
| Reception → customer + vehicle + order + booking | `backend/src/services/reception.service.js:136-179` | Four sequential writes (`resolveCustomer` :136, `vehicle.save()` :154, `repairOrderRepository.create` :158, `booking.save()` :178). Half-apply = orphan customer/vehicle rows, or an order with no booking link. Note `booking.repairOrderId` is the idempotency guard (:48-50), so a partial run **blocks the SA from retrying reception for that booking**. |
| Transfer approve | `backend/src/services/transfer-request.service.js` (`resolveTransferRequest`) | `repairOrder.technicianId` reassigned, then the request marked resolved. |
| Booking create → history | `backend/src/services/booking.service.js:326-355` | Booking created, then `bookingHistory` row. Audit history silently gaps. |

**Impact:** Financial and workflow inconsistency with no automated detection and, in several cases (quote confirm, additional service, reception), **no manual recovery path** because the first write is terminal/idempotency-guarded.

**Fix approach:** MongoDB Atlas (see `backend/.env.example:6`) supports multi-document transactions. Wrap each flow in `mongoose.startSession()` + `session.withTransaction()`, threading `{ session }` through the repository calls. Prioritise, in order: quote confirm → repair order, payment → invoice, additional-service approve → order. Alternatively make the *second* write the state-committing one (order first, then mark the quote approved) so a half-apply is retryable.

---

### 3. Parts catalog is isolated CRUD with no inventory movement — **Medium**

**Issue:** `stockQuantity` is declared (`backend/src/models/part.model.js:22-27`) and can be set by an admin (`backend/src/services/part.service.js:39-41,86-91`), but **nothing else in the codebase references it**. A repo-wide search for `stockQuantity`, `partRepository` and `PartModel` outside `part.service.js` / `part.model.js` / `part.repository.js` returns only the repository wiring:

```
backend/src/repositories/part.repository.js:1  import { PartModel } from "../models/index.js";
backend/src/repositories/part.repository.js:4  export const partRepository = createRepository(PartModel);
```

No quotation, repair order, additional-service or invoice flow ever reads a `Part`, decrements stock, or blocks on out-of-stock. The router is admin-only (`backend/src/routes/part.routes.js:8`), so a service advisor writing a `kind: "part"` quote line (`backend/src/models/service-quote.model.js:17`) would get 403 even if the UI tried to look one up. The SA quotation UI types part names and prices as free text (`frontend/src/pages/advisor/QuotationPage.tsx:866,875`) with no catalog reference.

**Impact:** `stockQuantity` is a decorative number that drifts from physical inventory the moment the garage opens. Parts on invoices are hand-typed strings with hand-typed prices — no price consistency, no consumption tracking, no reorder signal, and no link from a billed part back to a catalog SKU.

**Fix approach:** Either (a) scope it honestly as a reference price list, drop `stockQuantity` from the schema and open read access to `serviceAdvisor`, or (b) build real inventory: add `partId` to `quoteLineSchema` / `orderServiceSchema`, add a `StockMovement` collection, and decrement atomically (`findOneAndUpdate` with `{ stockQuantity: { $gte: qty } }` + `$inc: -qty`) at quote-confirm or additional-service-approve time. Do **not** use a read-modify-write `part.save()` — it has the same race as #8.

---

### 4. Invoice `dueAt` is set but nothing marks invoices overdue — **Medium**

**Issue:** `INVOICE_TERM_DAYS = 15` produces a `dueAt` (`backend/src/services/invoice.service.js:11,281`), but `INVOICE_STATUSES` has no `overdue` value (`backend/src/models/invoice.model.js:3`) and there is no scheduled job anywhere in `backend/src` that re-evaluates it. Overdue detection is left entirely to whatever the client does with `dueAt`.

**Impact:** Aging/receivables reporting can only be computed ad hoc per screen; two screens can disagree about what "overdue" means.

**Fix approach:** Either compute overdue as a derived value in one shared serializer (`serializeInvoice`, `invoice.service.js:56`) and expose `isOverdue` / `daysOverdue`, or add a real `overdue` status plus a nightly job. Prefer the derived value — no new write path, no new consistency risk.

---

### 5. Hard deletes where soft deletes are used elsewhere — **Medium**

**Issue:** The codebase is inconsistent about deletion:
- **Soft:** users (`backend/src/services/auth.service.js:196` `isActive = false`; `backend/src/services/admin.service.js:411` `findByIdAndUpdate(id, { isActive: false })`).
- **Hard, despite an `isActive` flag existing:** `deleteServiceCategory` (`backend/src/services/service.service.js:107`) and `deleteService` (`service.service.js:247`) both call `deleteById`.
- **Hard:** `deletePart` (`backend/src/services/part.service.js:110`), `deleteRepairOrder` (`backend/src/services/repair-order.service.js:360`, guarded to `pending` only), `deleteStepNote` (`repair-order.service.js:463`, splices by **array index** — racy if two admins delete concurrently).

**Impact:** Deleting a Service orphans every `Booking.serviceId` (`backend/src/models/booking.model.js:25`), `RepairOrder.services[].serviceId` (`repair-order.model.js:21`) and `ServiceQuote.lines[].serviceId` (`service-quote.model.js:15`). Populates then silently resolve to `null`, and `serializeInvoice` degrades a line's category to `""` (`backend/src/services/invoice.service.js:106`). Historical invoices lose their category breakdown retroactively. Deleting a service category also silently invalidates `Booking.serviceCategory` / `RepairOrder.serviceCategory` (stored as **names**, not FKs — `booking.model.js:33`, `repair-order.model.js:129`).

**Fix approach:** Make `deleteService` / `deleteServiceCategory` set `isActive = false` (the flag already exists and `getAllServices` already filters on it, `service.service.js:119`). If a real delete is wanted, first refuse when any Booking / RepairOrder / ServiceQuote references the id. Change `deleteStepNote` to target a note `_id` rather than an array index (needs `_id: false` removed from `stepNoteSchema`, `repair-order.model.js:97`).

---

### 6. Missing business constraints in the schema — **Medium**

**Present and correct:** `Invoice.repairOrderId` unique (`backend/src/models/invoice.model.js:41`), `Part.sku` unique (`part.model.js:13`), `User.email`/`lookupCode` unique+sparse (`user.model.js:23,37`), `Vehicle.licensePlate` unique (`vehicle.model.js:8`), one review per customer per order (`review.model.js:34`), booking seat lock (`booking.model.js:108-111`).

**Missing:**
- `ServiceQuote.code` is not unique (`service-quote.model.js:26-29`) even though it's generated as `QT-${Date.now()}` (`backend/src/services/quotation.service.js:50`) — two SAs clicking save in the same millisecond collide, and a caller-supplied `code` is accepted verbatim with no check.
- No constraint stopping **multiple `approved` quotes on one repair order**. `confirmQuotation` (`quotation.service.js:186-223`) *replaces* `order.services` wholesale, so approving a second quote silently discards the first quote's lines **and every approved additional-service line already pushed onto the order** (`additional-service.service.js:166`).
- `Service.name` and `ServiceCategory.name` are not unique, yet `serviceCategory` is stored on Booking/RepairOrder **by name** and looked up by name (`backend/src/services/booking.service.js:301-303`).
- `RepairOrder.totalCost` has no `required` (`repair-order.model.js:167-170`) — an order created by reception has `services: []` and `totalCost` undefined (`reception.service.js:158-166`), so `invoice.total` arithmetic depends on the order having been through a quote first.

**Fix approach:** Add a unique index on `ServiceQuote.code`; generate with `randomUUID()` or a counter rather than `Date.now()`. Add a partial unique index `{ repairOrderId: 1 }` where `status === "approved"`. Refuse `confirmQuotation` when the order already has `source: "additionalService"` lines, or merge instead of replace. Add unique indexes on `Service.name` and `ServiceCategory.name`.

---

## Known Bugs

### 7. `Booking.occupiesSlot` hook is bypassable by design — **Medium**

**Symptoms:** A cancelled/completed booking keeps `occupiesSlot: true`, so its seat stays inside the unique partial index (`backend/src/models/booking.model.js:108-111`) and the slot is permanently one seat short. `getSlots` (which counts by `status`, `backend/src/services/booking.service.js:99-102`) and `takenSeats` (which counts by `occupiesSlot`, `booking.service.js:82-85`) then **disagree** — the UI shows an available slot that every booking attempt rejects with 409 (`booking.service.js:348`).

The model documents the hazard explicitly:

```js
// backend/src/models/booking.model.js:94-97
// IMPORTANT: this hook only fires on document .save(). Future status changes
// (cancel/reschedule/complete) MUST go through .save() — updateOne /
// findOneAndUpdate / bulkWrite bypass this hook and leave occupiesSlot stale,
// silently keeping a freed seat locked.
```

**Current state:** all today's booking mutations do use `.save()` (`booking.service.js:436,470,537,609`) — verified, no live bug. The risk is entirely in what gets written next: `base.repository.js:16` exposes a generic `updateById` built on `findByIdAndUpdate`, which any future booking code can reach for.

**Trigger:** any new code path calling `bookingRepository.updateById(...)`, `BookingModel.updateOne`, `updateMany`, or `bulkWrite` with a `status` change. Also a direct DB fix-up in the Mongo shell.

**Workaround:** none at runtime; requires a manual DB repair (`updateMany` setting `occupiesSlot: false` where status is terminal).

**Fix approach:** Move the invariant off the document hook. Either add a matching `pre("findOneAndUpdate")` / `pre("updateOne")` hook that derives `occupiesSlot` from `$set.status`, or drop the field entirely and make the partial index filter on `status: { $in: [...] }` — the comment at `booking.model.js:105-107` notes `$in` isn't allowed in `partialFilterExpression`, so the alternative is a persisted derived field maintained in *all* update middlewares, not just `save`.

---

### 8. `reworkRequired` orders show as "Awaiting service intake" on public tracking — **Low**

**Symptoms:** `getStatusMeta` (`backend/src/services/tracking.service.js:17-52`) has cases for `completed`, `inProgress`, `cancelled` and a `pending` default. `reworkRequired` — a real member of `REPAIR_ORDER_STATUSES` (`backend/src/models/repair-order.model.js:7`) set whenever QC fails (`repair-order.service.js:559`) — falls through to the default and is reported to the customer as *"Awaiting service intake / Waiting for advisor review / 2 of 5 steps"*.

**Trigger:** any QC failure, then the customer checks `GET /api/tracking`.

**Impact:** A car that is being reworked appears to the customer to have gone *backwards* to intake. Progress percentage regresses from 5/5 to 2/5.

**Fix approach:** Add an explicit `case "reworkRequired"` returning a "Rework in progress" label at ~4/5 steps.

---

### 9. Concurrent payments can under-count `amountPaid` — **Medium**

**Symptoms:** Two accountants recording partial payments on the same invoice at the same time. `recordPayment` reads the invoice (`backend/src/services/payment.service.js:41`), computes `balanceDue` (:52), charges (:75), then writes back a **computed absolute value**:

```js
// backend/src/services/payment.service.js:87-90
invoice.amountPaid = (invoice.amountPaid || 0) + chargeAmount;
const remaining = invoice.total - invoice.amountPaid;
invoice.status = remaining <= 0 ? "paid" : "partiallyPaid";
await invoice.save();
```

Both requests read the same stale `amountPaid`; last write wins. Two ₫500k payments against a ₫1M invoice can leave `amountPaid = 500000` and status `partiallyPaid`, with two `succeeded` Payment rows and two `paymentRecorded` audit entries.

**Trigger:** concurrent `POST /api/payments` for one `invoiceId`. Low frequency in a single-desk garage, but the failure is silent and money-losing.

**Fix approach:** Replace the read-modify-write with an atomic conditional update:
`InvoiceModel.findOneAndUpdate({ _id, amountPaid: { $lte: total - chargeAmount } }, { $inc: { amountPaid: chargeAmount } }, { new: true })`, then derive status from the returned doc. Or wrap the whole `recordPayment` in a transaction (see #2).

---

## Security Considerations

### 10. OTPs are printed to the server console, never delivered — **High**

**Risk:** `deliverOtp` is a stub:

```js
// backend/src/utils/otp.js:22-27
export function deliverOtp({ email, code, purpose }) {
  console.log(`[otp] ${purpose} code for ${email}: ${code}`);
}
```

A working `sendEmail` exists (`backend/src/utils/mailer.js:40`) and is used for quotes / additional services / invoices, but `issueOtp` (`backend/src/services/auth.service.js:208-219`) never calls it.

**Impact (two separate problems):**
1. **Functional:** `POST /api/auth/forgot-password` and `/send-otp` cannot work for a real user in production — the code goes to stdout. `frontend/public/kapa-auth/my-account/lost-password/` exists as a user-facing flow that can never complete.
2. **Security:** every live password-reset and email-verification code is written in plaintext to application logs. Anyone with log access (hosting dashboard, log aggregator, a leaked log file) can take over any account. The OTP model deliberately stores only a SHA-256 hash so a DB leak can't reveal live codes (`backend/src/models/otp.model.js:15-20`) — the console.log defeats that entirely.

**Current mitigation:** `withDevCode` correctly suppresses `devCode` in API responses when `NODE_ENV === "production"` (`auth.service.js:252-257`) — but the `console.log` is unconditional.

**Fix approach:** Call `sendEmail` from `deliverOtp` (subject/body per purpose) and delete the `console.log`, or gate it behind `env.nodeEnv !== "production"`. Note SMTP is optional and `sendEmail` swallows failures (`mailer.js:62-65`) — for password reset the failure must surface to the caller, not be silently dropped.

---

### 11. Revoked access survives for up to 7 days — **High**

**Risk:** `requireAuth` verifies the JWT signature and nothing else:

```js
// backend/src/middlewares/auth.middleware.js:16
req.user = verifyAccessToken(token);
```

`verifyAccessToken` returns `{ sub, role }` straight from the token payload (`backend/src/utils/jwt.js:23`). No DB lookup, no `isActive` check, no token version, no denylist. Default expiry is `7d` (`backend/src/config/env.js:27`, `backend/.env.example:11`), and there is no refresh-token flow.

**Impact:**
- `deactivateUser` (`backend/src/services/admin.service.js:411`) and `deleteMe` (`backend/src/services/auth.service.js:196`) only set `isActive = false`. The check lives in `login` (`auth.service.js:85-87`) — which a holder of an existing token never calls. A fired employee keeps full API access for up to a week.
- Role is read from the token, so an admin demoting a user has no effect until expiry. All `requireRole` checks (`auth.middleware.js:33`) trust the stale claim.
- Tokens are stored in `localStorage` (`frontend/src/shared/auth/storage.ts:26`) — XSS-readable, and there are four `dangerouslySetInnerHTML` sinks (see #13).

**Fix approach:** In `requireAuth`, load the user and reject when `!isActive` (cache briefly if latency matters), and read `role` from the DB rather than the token. Shorten `JWT_EXPIRES_IN` to ~15m and add a refresh token. Add a `tokenVersion` on `User`, bump it on deactivate/role-change/password-reset, and include+verify it in the JWT.

---

### 12. No rate limiting, no security headers, unauthenticated write endpoint — **High**

**Risk:** `createApp` mounts exactly three middlewares: `requestLogger`, `cors`, `express.json` (`backend/src/app.js:13-15`). No `helmet`, no `express-rate-limit`, no body-size cap beyond express's 100kb default, no CSRF consideration (mitigated by Bearer-token auth), no request-id.

**Unprotected surfaces:**
| Endpoint | File | Exposure |
|----------|------|----------|
| `POST /api/auth/login` | `backend/src/routes/auth.routes.js:22` | Unlimited password guessing. `bcrypt` slows it but does not stop it. |
| `POST /api/auth/forgot-password` / `/send-otp` | `auth.routes.js:25-26` | Unlimited OTP issuance; each call `deleteMany`s the prior code (`auth.service.js:210`), so an attacker can invalidate a victim's OTP repeatedly. |
| `POST /api/auth/verify-otp` / `/reset-password` | `auth.routes.js:27-28` | `MAX_OTP_ATTEMPTS = 5` per code (`backend/src/utils/otp.js:10`), but requesting a fresh code is unlimited → unbounded guesses against a 6-digit space. |
| `POST /api/bookings` | `backend/src/routes/booking.routes.js:20` | **No auth at all.** Each call can create a `walkInCustomer` User and a Vehicle (`backend/src/services/booking.service.js:315-316`) and consume a seat. Trivial slot-exhaustion DoS + unbounded junk-customer creation. |
| `GET /api/tracking` | `backend/src/routes/tracking.routes.js:8` | Public. Plate + phone returns full customer name/phone, services, prices, invoice total (`backend/src/services/tracking.service.js:234-256`). Unlimited attempts allow brute-forcing a phone against a known plate. |

**Current mitigation:** CORS is origin-restricted (`env.js:28`); the error handler doesn't leak stack traces to clients (`backend/src/middlewares/error.middleware.js:31-34`); `passwordHash` is stripped on serialization (`backend/src/models/user.model.js:67-72`); login returns an identical message for unknown-email and wrong-password (`auth.service.js:78-81`).

**Fix approach:** Add `helmet()`. Add `express-rate-limit` — strict on `/api/auth/*` (e.g. 5/15min per IP+email) and `/api/tracking`, moderate on `POST /api/bookings`. Cap OTP issuance per email per hour. Consider a captcha or phone verification on public booking creation.

---

### 13. Cloned WordPress theme injected via `dangerouslySetInnerHTML` — **Medium**

**Risk:** Four pages fetch a static HTML file at runtime and inject its body:
- `frontend/src/pages/home-five/ui/HomeFivePage.tsx:62`
- `frontend/src/pages/appointment/ui/AppointmentPage.tsx:84`
- `frontend/src/pages/contact-us/ui/ContactUsPage.tsx:35`
- `frontend/src/pages/our-brands/ui/OurBrandsPage.tsx:34`

`useClonedKapaPage` (`frontend/src/shared/lib/kapa-template/useClonedKapaPage.ts:81-95`) `fetch`es the URL and (`:153-180`) extracts every `<script>` from the cloned document and appends it to `document.head`, executing it in the app's origin alongside the auth token in `localStorage`.

**Current mitigation:** the HTML is same-origin static content under `frontend/public/kapa-auth/`, not user input — so this is not exploitable today.

**Impact if it changes:** anyone who can write to `public/kapa-auth/*.html` (a compromised CDN, a misconfigured static host, a future "editable page" feature) gets arbitrary JS execution and can exfiltrate the JWT from `localStorage` (`frontend/src/shared/auth/storage.ts:26`).

**Recommendations:** Keep the source strictly build-time/same-origin — never point `htmlUrl` at a remote or user-supplied URL. Add a CSP that restricts `script-src` to `'self'`. Longer term, replace the runtime clone-and-execute with a build-time conversion to real React components (also fixes #14).

---

## Missing Critical Features

### 14. Customer approval is never captured before extra work is billed — **High**

**Issue:** The additional-service flow claims a customer decision step that does not exist.

`updateAdditionalServiceProposal` (`backend/src/services/additional-service.service.js:118-217`) accepts `"pending" | "sent" | "approved" | "rejected"` (`:11`) and is reachable only by `serviceAdvisor` / `admin` (`backend/src/routes/additional-service.routes.js:29`). On `"approved"` it immediately pushes a billable line onto the repair order and recomputes `totalCost`:

```js
// backend/src/services/additional-service.service.js:163-179
if (status === "approved") {
  const order = await repairOrderRepository.findById(proposal.repairOrderId);
  if (order) {
    order.services.push({ ..., priceAtTime: (proposal.laborCost||0) + (proposal.partsCost||0), source: "additionalService" });
    order.totalCost = order.services.reduce(...);
    await order.save();
  }
}
```

The `"sent"` branch (`:186-214`) emails the customer *"Please log in to your account to approve or decline it"* (`:210`) — but:
- There is **no customer-facing endpoint** to act on a proposal. The router exposes only advisor/technician/admin roles (`additional-service.routes.js:15,22,29`).
- There is **no customer UI**. `frontend/src/pages/customer/` contains only `bookings`, `invoices`, `profile`, `reviews`, `tracking`; its API module calls only `/api/bookings/mine`, `/api/repair-orders/mine`, `/api/invoices/mine`, `/api/auth/me`, `/api/reviews` (`frontend/src/pages/customer/api/customerApi.ts:174-209`).
- `approved` is terminal (`additional-service.service.js:16,133`), so the SA can go straight `pending → approved` and skip `sent` entirely.
- The schema *anticipates* the two-stage flow — `approvedByCustomer` / `rejectedByCustomer` exist in `SERVICE_REQUEST_STATUSES` (`backend/src/models/service-request.model.js:13-16`) with a comment saying they have "no UI yet" — and `reviewedBy` (`:82`) stores the **SA**, not the customer.

The same gap exists for quotations. `confirmQuotation` is advisor-only (`backend/src/routes/quotation.routes.js:55`) and its own docstring says it's the SA recording a decision made "e.g. over the phone" (`backend/src/services/quotation.service.js:157-159`) — while `sendQuotation`'s email tells the customer to "log in to your account to review and approve it" (`quotation.service.js:145`).

**Impact:**
- **Business/legal:** extra work is added to the bill with no captured customer consent. The only record is `reviewedBy = <the advisor>`. In a billing dispute there is nothing to point to.
- **UX:** two production emails instruct customers to do something the product cannot do. Whatever they log in expecting, they will not find.

**Blocks:** any real dispute resolution, and any claim that the system implements a customer-approval workflow.

**Fix approach (minimum viable):** Add `GET /api/additional-service-proposals/mine` and `PATCH /api/additional-service-proposals/:id/respond` for `onlineCustomer`, scoped through `repairOrder → vehicle → customerId` (the same chain `listMyInvoices` uses, `backend/src/services/invoice.service.js:183-201`). Set `approvedByCustomer` / `rejectedByCustomer` and record `respondedAt`. Only push the order line once the **customer** approves, not on SA approval. Mirror this for quotations. Until the UI exists, remove the "log in to approve" sentence from both emails (`quotation.service.js:145`, `additional-service.service.js:210`) — it's actively misleading.

---

### 15. Audit trail covers only three billing actions — **Medium**

**Issue:** `AUDIT_ACTIONS = ["invoiceGenerated", "invoiceSent", "paymentRecorded"]` (`backend/src/models/audit-log.model.js:3`), enforced by the schema enum (`:9`). `logAudit` is called from exactly three places: `backend/src/services/invoice.service.js:303,358` and `backend/src/services/payment.service.js:93`. The audit log is also read-restricted to `accountant`/`admin` (`backend/src/routes/audit-log.routes.js:11`).

**Not audited — every one of these mutates money, safety or access:**
| Action | File |
|--------|------|
| Quality check pass/fail | `backend/src/services/repair-order.service.js:536` |
| Quotation approve/reject (sets the order's price) | `backend/src/services/quotation.service.js:164` |
| Additional service approve (adds a billable line) | `backend/src/services/additional-service.service.js:118` |
| Repair order create / update / **delete** | `repair-order.service.js:112,151,346` |
| Step note delete | `repair-order.service.js:448` |
| Staff account creation | `backend/src/services/auth.service.js:102` |
| User deactivation | `backend/src/services/admin.service.js:411` |
| Password reset | `auth.service.js:335` |
| Service / category / part CRUD | `backend/src/services/service.service.js`, `part.service.js` |
| Technician transfer approval | `backend/src/services/transfer-request.service.js` |

Partial compensating controls exist but are inconsistent: bookings have a dedicated `BookingHistory` collection (`backend/src/models/booking-history.model.js`, written at `booking.service.js:351,438,472,552,612`), and QC results survive only as free text in `stepNotes` (`repair-order.service.js:567-571`) which nothing queries or exposes as an audit view.

`logAudit` is best-effort and swallows its own failures (`backend/src/utils/audit.js:20-23`), so even the three covered actions can silently produce no entry.

**Impact:** No answer to "who approved this ₫X line?", "who deleted this repair order?", "who created this admin account?". Combined with #14 (no captured customer consent) and #1 (QC is not recorded structurally), a billing dispute has essentially no evidence trail.

**Fix approach:** Widen `AUDIT_ACTIONS` to cover the table above and call `logAudit` from each service. Add `entityType`/`entityId` generic fields (currently only `invoiceId`/`repairOrderId` exist, `audit-log.model.js:17-24`). Add `before`/`after` snapshots for value-changing actions. Open the read route to `serviceAdvisor` for their own orders. Consider making audit failures loud for financial actions rather than swallowed.

---

## Fragile Areas

### 16. Any staff role can read every repair order — **Medium**

**Files:** `backend/src/services/repair-order.service.js:31-45`, `backend/src/routes/repair-order.routes.js:34-47,84-89,111-123`.

**Why fragile:** `getAllRepairOrders` accepts optional filters but applies **no ownership scoping** — a technician calling `GET /api/repair-orders` with no query string receives every order in the system, including customer names, phones, emails and prices via `repairOrderPopulate` (`repair-order.service.js:17-28`). `GET /:id`, `/:id/status`, `/:id/summary` and `/:id/step-notes` are all open to `admin, accountant, serviceAdvisor, technician` with no check that the caller is the assigned technician or advisor.

Correct scoping *is* implemented elsewhere and can be copied: `getMyRepairOrders` (`repair-order.service.js:48-61`), `listMyInvoices` (`invoice.service.js:183-201`), notifications (`backend/src/services/notification.service.js:33,64`), schedules (`backend/src/services/schedule.service.js:62-67,93-98,169-174`), bookings (`assertCanManage`, `booking.service.js:222-226`).

**Safe modification:** When touching this file, mirror the `schedule.service.js` pattern — pass `requester` into the service and force `filter.technicianId = requester.sub` when `requester.role === "technician"`.

**Test coverage:** `backend/tests/integration/repair-order.routes.test.js` exists but there is no test asserting a technician *cannot* read another technician's order.

---

### 17. Mock payment gateway always succeeds — **Medium**

**Files:** `backend/src/utils/paymentGateway.js:11-33`, consumed at `backend/src/services/payment.service.js:75`.

**Why fragile:** `charge()` sleeps 10ms and returns `succeeded` unless the **client** passes `simulate: "fail"` — and `simulate` is taken straight from the request body (`payment.service.js:35`, `backend/src/controllers/payment.controller.js`). There is no real settlement, no idempotency key, no webhook, no reconciliation. `payment.gatewayRef` is `MOCK-<uuid>`.

**Safe modification:** Treat every value returned by `charge()` as untrusted-but-final today. When a real gateway lands, the shape of `recordPayment` will need an async settlement path (pending → webhook → succeeded), which the current synchronous flow (`payment.service.js:75-90`) cannot express.

**Test coverage:** `backend/tests/unit/payment.service.test.js` exists; there is no test for concurrent payments (see #9).

---

### 18. Cloned WordPress theme fights React on every template page — **Medium**

**Files:**
- `frontend/src/widgets/appointment-booking/ui/AppointmentBookingForm.tsx:96-123` (the workaround)
- `frontend/src/shared/lib/kapa-template/useClonedKapaPage.ts:143-180` (the script loader)
- `frontend/public/kapa-auth/` — **24 MB, 352 tracked files**, including full WooCommerce, Elementor, Contact Form 7 and jQuery plugin bundles.

**Why fragile:** The theme's `kapa-main.js` runs `$('select').niceSelect()` on load, replacing every native `<select>` with a static overlay div and hiding the real control. Because the theme scripts load on an async timeline independent of the React island (`useClonedKapaPage.ts:153-180` appends ~40 scripts at once), it frequently runs *after* React's selects mount, freezing an overlay showing a stale placeholder and swallowing clicks. The current defence is a permanent `MutationObserver` that strips the overlay and un-hides the native select:

```ts
// frontend/src/widgets/appointment-booking/ui/AppointmentBookingForm.tsx:112-121
const neutralizeNiceSelect = () => {
  panel.querySelectorAll('.nice-select').forEach((overlay) => overlay.remove())
  panel.querySelectorAll('select').forEach((select) => {
    if (select.style.display === 'none') select.style.removeProperty('display')
  })
}
neutralizeNiceSelect()
const observer = new MutationObserver(() => neutralizeNiceSelect())
observer.observe(panel, { childList: true, subtree: true })
```

This is scoped to `panelRef` only. Any *other* React form rendered inside a cloned template page will hit the identical bug with no protection. The observer also runs for the page's lifetime, re-firing on every React re-render inside the panel.

`useClonedKapaPage` additionally mutates global state — `document.title`, `document.body.className`, `body.dataset.*`, a `<base>` element, and it disables every `/kapa-auth/` stylesheet in `<head>` (`:100,112-116,59-62`). The cleanup path (`:64-79,238-248`) restores it, but two cloned pages mounted concurrently would corrupt each other's saved "previous" values. `index.html:13-41` also loads 29 theme stylesheets globally on every route, including admin/accountant screens that never use them.

**Safe modification:** Do not add new React form controls inside a cloned template page without replicating the neutralizer. Preferably extract it into a shared hook (`useNeutralizeNiceSelect(ref)`) in `frontend/src/shared/lib/kapa-template/`.

**Longer-term fix:** Convert the four cloned pages to real React components at build time and delete `public/kapa-auth/` (24 MB, and 352 files of vendored WordPress in git history). This eliminates the race, the `dangerouslySetInnerHTML` sinks (#13), and the 29 global stylesheets.

---

## Performance Bottlenecks

### 19. Unpaginated list endpoints with deep populates — **Medium**

**Problem:** Several list endpoints fetch the entire collection with multi-level populates and no `limit`:
- `listInvoices` (`backend/src/services/invoice.service.js:170-181`) — `find()` with no filter, `invoicePopulate` (`:13-31`) three levels deep (invoice → repairOrder → vehicle → customer, plus `services.serviceId`), then `getLatestPayments` fetches **every** payment for every invoice (`:150-168`) and de-dupes in JS.
- `getAllRepairOrders` (`backend/src/services/repair-order.service.js:40-45`) — six populates, no limit.
- `listPayments` (`backend/src/services/payment.service.js:110-114`), `listBookings` (`backend/src/services/booking.service.js:391-397`), `listQuotations` (`backend/src/services/quotation.service.js:254`), `listReviews` (`backend/src/services/review.service.js:79-83`) — all unbounded.

Only notifications paginate (`backend/src/services/notification.service.js:12`, capped at 100).

**Cause:** No pagination convention. Populates issue an extra query per referenced collection; the 3-level invoice populate is 5+ round trips before serialization.

**Improvement path:** Add `?page`/`?limit` (default 50, max 100) to every list endpoint, mirroring `notification.service.js:12`. Replace `getLatestPayments`'s fetch-all with an aggregation (`$sort` + `$group` `$first`). Add indexes for the common sorts — `Invoice.issuedAt`, `RepairOrder.status + createdAt`, `Payment.invoiceId + paidAt`. Only `Booking` and `Otp` currently declare non-unique indexes (`booking.model.js:89`, `otp.model.js:43-45`).

---

### 20. `technicianBreakdown` scans all repair orders per report — **Low**

**Problem:** `backend/src/services/admin.service.js:80-83` runs a second aggregation over **every** repair order ever assigned to a technician, unfiltered by date, on each revenue-report request. The code documents this as a deliberate approximation (`admin.service.js:42-47`) because completion rate can't be time-bounded.

**Improvement path:** Add an index on `RepairOrder.technicianId`, or persist a per-technician counter. Note `RepairOrder` does have `timestamps: true` (`repair-order.model.js:191`), so `createdAt` **is** available — the comment at `admin.service.js:45` claiming "RepairOrder carries no creation timestamp" is stale, and the approximation can now be replaced with a real date-bounded denominator.

---

## Dependencies at Risk

### 21. Bleeding-edge frontend stack — **Low**

`frontend/package.json`: React `^19.2.7`, TypeScript `~6.0.2`, Vite `^8.0.12`, antd `^6.4.3`, react-router-dom `^7.17.0`, Tailwind `^4.3.0`, `@vitejs/plugin-react` `^6.0.2`.

**Risk:** Every major is at or near its newest release, and `^` ranges allow silent minor upgrades. There is no lockfile-enforced CI (no CI config in the repo at all), so two developers can resolve different trees.

**Impact:** A minor release of antd 6 or Vite 8 can break the build with no test suite to catch it — the frontend has **zero tests** (`find frontend/src -name "*.test.*"` → empty) despite `playwright` being installed as a devDependency.

**Migration plan:** Pin exact versions for antd, Vite, TypeScript and React, or add `npm ci` + `tsc --noEmit` to a CI check. `frontend/package-lock.json` is committed, which helps only if CI uses `npm ci`.

### 22. `mongodb` driver declared alongside `mongoose` — **Low**

`backend/package.json` lists both `mongoose@^8.6.0` and `mongodb@^7.3.0` as direct dependencies. Mongoose 8 bundles its own driver; a mismatched top-level `mongodb` can hoist a conflicting version. No source file imports `mongodb` directly.

**Fix:** Remove the direct `mongodb` dependency unless something genuinely needs the raw driver.

---

## Test Coverage Gaps

Backend has **18 unit + 18 integration** suites (`backend/tests/unit/`, `backend/tests/integration/`) running on Vitest + `mongodb-memory-server`. Coverage is configured for `src/services`, `src/controllers`, `src/routes` (`backend/vitest.config.js:14-18`) with **no thresholds**, so coverage can regress silently.

| Gap | Files | Risk | Priority |
|-----|-------|------|----------|
| **Parts catalog — zero tests.** No `part.service.test.js` or `part.routes.test.js` exists. | `backend/src/services/part.service.js`, `backend/src/routes/part.routes.js` | The newest backend module has no regression net; SKU-uniqueness and validation paths are unverified. | High |
| **Audit log — zero tests.** No `audit-log.*.test.js`. | `backend/src/services/audit-log.service.js`, `backend/src/utils/audit.js` | The only compliance artifact is untested, and `logAudit` swallows failures (`utils/audit.js:20-23`). | High |
| **QC → invoice gate.** No test asserts that an order which skipped QC cannot be invoiced. | `backend/src/services/invoice.service.js:245`, `repair-order.service.js:536` | Finding #1 would be caught permanently. | High |
| **Concurrency.** No test covers double payment on one invoice, double quote-confirm on one order, or two bookings racing for the last seat. | `payment.service.js:87`, `quotation.service.js:186`, `booking.service.js:323-346` | Findings #6 and #9 are invisible to CI. The E11000 seat-retry loop (`booking.service.js:339-345`) is the trickiest code in the repo. | High |
| **Authorization negatives.** Integration suites exist per route file but there is no systematic "role X gets 403 on endpoint Y" matrix, and nothing asserts a technician cannot read another technician's order. | all `backend/tests/integration/*.routes.test.js` | Finding #16 regressions ship silently. | Medium |
| **Transaction / partial-failure behaviour.** Nothing simulates a crash between the two writes in any flow from #2. | all services | Data-corruption paths are unexercised. | Medium |
| **`occupiesSlot` invariant.** No test asserts `occupiesSlot === false` after cancel/complete, or that a freed seat is re-bookable. | `backend/src/models/booking.model.js:98` | Finding #9's regression guard. | Medium |
| **`reworkRequired` in tracking.** `tracking.service.test.js` exists but does not cover the missing status case. | `backend/src/services/tracking.service.js:43` | Finding #8. | Low |
| **Frontend — zero tests entirely.** No `*.test.tsx`, no Playwright specs, despite `playwright@^1.61.1` in devDependencies. 21k lines of TSX untested, including 1,263-line `QuotationPage.tsx`. | `frontend/src/` | No regression net on the largest, most business-critical UI. | Medium |
| **No linter or formatter.** No `.eslintrc*`, `eslint.config.*`, `biome.json` or `.prettierrc*` anywhere. | repo root, `backend/`, `frontend/` | Style drift; unused imports and dead code (#23) go undetected. | Medium |
| **No coverage thresholds and no CI.** | `backend/vitest.config.js:14-18`; no `.github/workflows` | Nothing enforces that any of the above gets fixed. | Medium |

---

## Dead Code

### 23. Unused mock-data modules still bundled — **Low**

- **`frontend/src/pages/accountant/model/mock.ts` (139 lines) — entirely unused.** Nothing in `frontend/src` imports it (`grep -rn "model/mock"` returns only `customer/model/*` consumers). It defines an obsolete `InvoiceStatus` vocabulary (`'Awaiting approval' | 'Ready to bill' | 'Paid' | 'Adjusted'`, `:1`) that contradicts the real backend enum (`unpaid | partiallyPaid | paid | cancelled`, `backend/src/models/invoice.model.js:3`) and hardcoded USD figures (`:22-25`) in a VND system.

- **`frontend/src/pages/customer/model/mock.ts` (408 lines) — types used, data dead.** Four consumers import from it, all with `import type` (`CustomerBookingsPage.tsx:23`, `CustomerInvoicesPage.tsx:24`, `mapTrackingRecord.ts:1`, `CustomerTrackingPage.tsx:13`). The four exported data arrays — `trackingRecords:31`, `customerProfile:97`, `bookingHistory:194`, `customerInvoices:292` — have no importers. The customer pages are fully on the API (`frontend/src/pages/customer/api/customerApi.ts:174-209`).

**Impact:** Low — `import type` is erased at compile time, so only the accountant file adds bundle weight. The real cost is that both files present a competing, stale definition of domain vocabulary that a future contributor may follow.

**Fix approach:** Delete `accountant/model/mock.ts`. In `customer/model/mock.ts`, strip the four data arrays and rename it to `types.ts` — or better, move the types next to the API layer (`customer/api/customerApi.ts`) so they're derived from the real contract.

### 24. Stale/incorrect comments — **Low**

- `backend/src/services/admin.service.js:45` — "RepairOrder carries no creation timestamp" is false; the schema sets `timestamps: true` (`backend/src/models/repair-order.model.js:191`). The documented approximation is no longer necessary.
- `backend/src/services/quotation.service.js:122-124` — "no more phone-matching fallback needed" describes a removal, not current behaviour.
- `backend/src/models/service-request.model.js:3-7` and `backend/src/models/service-quote.model.js:2-6` both describe customer-approval states as "for a future flow with no UI yet" — accurate, but they read as design notes rather than the blocking gap documented in #14.

**Fix approach:** Repo convention (per the existing comment style) is to describe current state only. Correct `admin.service.js:45` and remove the temporal phrasing in the other three.

---

*Concerns audit: 2026-07-23*
