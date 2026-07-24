# Codebase Structure

**Analysis Date:** 2026-07-23

## Repository Layout

```text
WDP301-project/
├── backend/                 # Node.js + Express + Mongoose API
├── frontend/                # React 19 + TypeScript + Vite SPA
├── docs/                    # Domain + FE technical docs (Vietnamese business spec)
├── test/                    # Excel test-case workbooks (unit/integration/system, deliverables)
├── clone-2/                 # Cloned reference material — not part of the build
├── .planning/codebase/      # These analysis documents
└── .claude/                 # Claude Code settings
```

Two independent npm packages — there is **no** workspace/monorepo tooling. Run `npm install` separately in `backend/` and `frontend/`.

## Backend — `backend/`

```text
backend/
├── nodemon.json             # dev watcher config
├── vitest.config.js         # test runner config
├── package.json             # scripts: dev | start | seed | test | test:watch | test:coverage
├── scripts/                 # one-off operational scripts (not imported by src/)
│   ├── seed.js                     # full catalog/demo seed
│   ├── seed-admin.js               # bootstrap the first admin account
│   ├── backfill-booking-seats.js   # backfill Booking.seatNo for the capacity index
│   ├── backfill-invoiced-at.js     # backfill RepairOrder.invoicedAt
│   └── test-slot-concurrency.js    # hammer the slot seat-lock index
├── tests/
│   ├── unit/                # 18 × <domain>.service.test.js — services in isolation
│   └── integration/         # 18 × <domain>.routes.test.js — supertest + mongodb-memory-server
└── src/
    ├── server.js            # ENTRY: connectDb() then app.listen()
    ├── app.js               # Express app factory: middleware chain + /api mount
    ├── config/
    │   ├── env.js           # process.env → typed `env` object (single read point)
    │   ├── db.js            # mongoose connect + dbStatus()
    │   └── constants.js     # SLOT_CAPACITY, ACTIVE_BOOKING_STATUSES, getSlotTimes()
    ├── routes/              # URL → guards → controller. index.js mounts all 20 routers
    ├── controllers/         # thin HTTP adapters (req/res only), 20 files
    ├── services/            # ALL business logic + state machines, 19 files
    ├── repositories/        # createRepository(Model) wrappers, 20 files
    ├── models/              # 21 Mongoose schemas + index.js barrel
    ├── middlewares/         # auth, error, logger, upload, validate
    ├── validators/          # plain (body) => string|null functions (auth only today)
    └── utils/               # apiError, apiResponse, audit, catchAsync, cloudinary,
                             # date, jwt, logger, mailer, notify, otp, password,
                             # paymentGateway
```

### Backend folder responsibilities

**`src/config/`:**
- Purpose: environment + infrastructure wiring and tunable business constants.
- Key files: `env.js` (the only place `process.env` is read), `db.js`, `constants.js` (opening hours 08:00–16:00, `SLOT_CAPACITY = 5`).

**`src/routes/`:**
- Purpose: declare the HTTP surface. One `*.routes.js` per domain, all mounted in `routes/index.js`.
- Contains: `requireAuth`, `requireRole(...)`, `validateBody(...)`, `imageUpload().array(...)`, `catchAsync(controller)`.
- Rule: no logic beyond guard composition.

**`src/controllers/`:**
- Purpose: unwrap `req.body` / `req.params` / `req.query` / `req.user`, call one service function, pick the status code.
- Pattern: `import * as xService from "../services/x.service.js"`.
- Size signal: most are 7–45 lines; the largest is `repair-order.controller.js` (128).

**`src/services/`:**
- Purpose: every business rule, validation guard, status-transition check, notification, email, and audit write.
- Key files: `booking.service.js` (629), `repair-order.service.js` (635), `admin.service.js` (419), `invoice.service.js` (371), `auth.service.js` (354), `tracking.service.js` (267).
- Cross-service reuse: `reception.service.js` imports `resolveCustomer`/`resolveVehicle` from `booking.service.js`.

**`src/repositories/`:**
- Purpose: the only layer allowed to import a Mongoose model.
- Contains: `base.repository.js` (the `createRepository` factory) + 19 four-to-seven-line wrappers.
- Escape hatch: `xRepository.model` for populate/aggregate chains.

**`src/models/`:**
- Purpose: schemas, exported status enums, indexes, `pre("save")` hooks.
- Key files: `repair-order.model.js` (the spine, 197 lines), `booking.model.js` (seat-lock indexes), `invoice.model.js`, `user.model.js` (`USER_ROLES`).
- Convention: every status enum is exported (`REPAIR_ORDER_STATUSES`, `INVOICE_STATUSES`, …) and imported by services for validation.

**`src/middlewares/`:**
- `auth.middleware.js` — `requireAuth`, `requireRole`
- `error.middleware.js` — `notFound`, `errorHandler` (the 4-arg Express handler)
- `logger.middleware.js` — `requestLogger`
- `upload.middleware.js` — `imageUpload()` multer memory storage, 5 MB image cap
- `validate.middleware.js` — `validateBody(validatorFn)`

**`src/utils/`:**
- Purpose: shared cross-cutting helpers. Zero business rules.
- Notable: `apiError.js` (the `ApiError` class every service throws), `catchAsync.js`, `notify.js` (`createNotification`/`notifyRole`, best-effort), `audit.js` (`logAudit`), `mailer.js`, `cloudinary.js`, `paymentGateway.js` (mock `charge()`), `jwt.js`, `password.js`, `otp.js`.

## Frontend — `frontend/`

```text
frontend/
├── index.html               # Vite entry HTML
├── vite.config.ts           # react + tailwindcss v4 plugins only (no path aliases)
├── tsconfig.json
├── package.json             # scripts: dev | build (tsc && vite build) | preview
├── public/
│   ├── kapa-auth/           # cloned WordPress theme pages (appointment, contact-us,
│   │                        # home-five, my-account, our-brands, wp-content, wp-includes)
│   ├── external/            # self-hosted Google Fonts mirrors
│   ├── favicon.svg, icons.svg
├── dist/                    # build output (committed artifact — do not edit)
└── src/
    ├── main.tsx             # ENTRY: mounts <App /> inside the router + AuthProvider
    ├── styles.css           # Tailwind entry + global styles
    ├── app/
    │   ├── App.tsx          # THE route table (see below)
    │   ├── route-guards.tsx # RequireAuth / RequireRole
    │   ├── index.ts         # re-exports App
    │   ├── providers/       # (.gitkeep — empty)
    │   └── router/          # (.gitkeep — empty)
    ├── entities/            # (empty — FSD slot, unused)
    ├── features/            # (empty — FSD slot, unused)
    ├── pages/               # one folder per role/screen group (see below)
    ├── widgets/             # cross-page composite UI
    └── shared/              # api clients, auth, design tokens, UI kit, libs
```

### Frontend folder responsibilities

**`src/app/`:**
- Purpose: routing and route-level authorization only.
- Key files: `App.tsx` (every route, all role screens lazy-loaded behind `Suspense`), `route-guards.tsx`.
- `providers/` and `router/` are empty placeholders — providers currently live in `main.tsx`.

**`src/pages/`:**
- Purpose: one screen (or screen group) per route.
- Two coexisting layouts:
  - **Sliced** (`accountant`, `admin`, `customer`, `auth`, `appointment`, `contact-us`, `home-five`, `our-brands`, `services`): `pages/<area>/<screen>/ui/XPage.tsx` + `index.ts` barrel, with API modules at `pages/<area>/api/<area>Api.ts` or `pages/<area>/<screen>/api/*.ts`, and a shell in `pages/<area>/ui/<Area>Shell.tsx`.
  - **Flat** (`advisor`, `technician`): `pages/advisor/QuotationPage.tsx` — no `ui/` subfolder, no barrel; imported directly by `App.tsx`.
- Mock data lives at `pages/<area>/model/mock.ts` (`accountant`, `customer`).

**`src/widgets/`:**
- Purpose: reusable composite UI shared across pages.
- `backoffice-shell/` — `BackOfficeShell`, `StatCard`, `InlineBanner`, `palettes.ts`, `useApiMessage`, `useCountUp` (used by admin + accountant)
- `service-advisor-shell/`, `technician-shell/` — role navigation shells
- `notification-center/` — bell + dropdown backed by `shared/api/notifications.ts`
- `appointment-booking/` — the public booking form (`ui/AppointmentBookingForm.tsx`, `api/appointmentApi.ts`)
- `home-five-estimate/` — marketing estimate section

**`src/shared/`:**
- `lib/api-client.ts` — `API_BASE_URL`, `apiRequest<T>()`, `ApiClientError`, `resolveApiAssetUrl()`. **Every** network call goes through this.
- `lib/kapa-template/` — hooks that clone the WordPress theme HTML into React (`useClonedKapaPage`, `parseTemplatePage`, `pruneKapaNavbar`, `rewriteKapaRouteLinks`, `useMountKapaNavbarWidgets`, `usePageMeta`).
- `lib/csv-export.ts`, `lib/pdf-export.ts` — report/invoice export helpers.
- `auth/` — `AuthProvider.tsx`, `useAuth.ts`, `api.ts`, `storage.ts`, `types.ts`, `routes.ts` (`getPostLoginPath`, `getRoleLabel`).
- `api/workshop.ts` — the big shared backend DTO types (`ApiVehicle`, `ApiService`, `ApiRepairOrder`, …) plus generic workshop calls; `api/notifications.ts`.
- `config/theme.ts` + `theme.css` — design tokens (`theme.color.*`) used inline throughout.
- `ui/base.tsx`, `ui/kapa-chrome/*` (navbar/footer/banner/topbar/password field), `ui/kapa-customer/*` (customer portal component kit), `ui/invoice/InvoiceDocument.tsx`.

## Frontend Route Table

Source: `frontend/src/app/App.tsx`. Guards: `RequireAuth` = logged in; `RequireRole roles={[...]}` = exact role match (single-role per route — an admin is redirected off advisor/accountant screens).

### Public (no guard)

| Path | Component | File |
|------|-----------|------|
| `/` | `HomeFivePage` | `frontend/src/pages/home-five/ui/HomeFivePage.tsx` |
| `/home-five` | `HomeFivePage` | same |
| `/contact-us` | `ContactUsPage` | `frontend/src/pages/contact-us/ui/ContactUsPage.tsx` |
| `/appointment` | `AppointmentPage` | `frontend/src/pages/appointment/ui/AppointmentPage.tsx` |
| `/our-brands` | `OurBrandsPage` | `frontend/src/pages/our-brands/ui/OurBrandsPage.tsx` |
| `/services` | `ServicesPage` (lazy) | `frontend/src/pages/services/ui/ServicesPage.tsx` |
| `/tracking` | `CustomerTrackingPage` (lazy) | `frontend/src/pages/customer/tracking/ui/CustomerTrackingPage.tsx` |
| `/my-account` | `MyAccountPage` (login) | `frontend/src/pages/auth/my-account/ui/MyAccountPage.tsx` |
| `/my-account/lost-password` | `LostPasswordPage` | `frontend/src/pages/auth/lost-password/ui/LostPasswordPage.tsx` |
| `/my-account/reset-password` | `ResetPasswordPage` | `frontend/src/pages/auth/reset-password/ui/ResetPasswordPage.tsx` |
| `/customer/login` | `MyAccountPage` (alias) | same as `/my-account` |
| `/customer/forgot-password` | `LostPasswordPage` (alias) | same |
| `/admin/login` | `MyAccountPage` (alias) | same |
| `/admin/forgot-password` | `LostPasswordPage` (alias) | same |

### Redirects

| Path | Redirects to |
|------|--------------|
| `/customer/tracking` | `/tracking` |
| `/admin` | `/admin/dashboard` |
| `/accountant` | `/accountant/invoices` |
| `/advisor` | `/advisor/dashboard` |
| `/technician` | `/technician/work-orders` |
| `*` (catch-all) | `/my-account` |

### `onlineCustomer`

| Path | Component | File |
|------|-----------|------|
| `/customer/profile` | `CustomerProfilePage` | `frontend/src/pages/customer/profile/ui/CustomerProfilePage.tsx` |
| `/customer/bookings` | `CustomerBookingsPage` | `frontend/src/pages/customer/bookings/ui/CustomerBookingsPage.tsx` |
| `/customer/invoices` | `CustomerInvoicesPage` | `frontend/src/pages/customer/invoices/ui/CustomerInvoicesPage.tsx` |
| `/customer/reviews` | `CustomerReviewsPage` | `frontend/src/pages/customer/reviews/ui/CustomerReviewsPage.tsx` |

Post-login landing: `/customer/profile`.

### `serviceAdvisor`

| Path | Component | File | Backend counterpart |
|------|-----------|------|---------------------|
| `/advisor/dashboard` | `ServiceAdvisorDashboardPage` | `frontend/src/pages/advisor/ServiceAdvisorDashboardPage.tsx` | `GET /api/advisor/dashboard` |
| `/advisor/bookings` | `BookingRequestsPage` | `frontend/src/pages/advisor/BookingRequestsPage.tsx` | `GET /api/bookings`, `PATCH /:id/confirm` |
| `/advisor/reception` | `VehicleReceptionPage` | `frontend/src/pages/advisor/VehicleReceptionPage.tsx` | `POST /api/receptions`, `GET /api/receptions/history` |
| `/advisor/inspection` | `VehicleInspectionPage` | `frontend/src/pages/advisor/VehicleInspectionPage.tsx` | `POST /api/inspection-reports` |
| `/advisor/quotation` | `QuotationPage` | `frontend/src/pages/advisor/QuotationPage.tsx` | `/api/quotations` (create/send/confirm) |
| `/advisor/work-orders` | `RepairOrderAssignmentPage` | `frontend/src/pages/advisor/RepairOrderAssignmentPage.tsx` | `PUT /api/repair-orders/:id` (assign technician) |
| `/advisor/additional-services` | `AdditionalServiceSuggestionPage` | `frontend/src/pages/advisor/AdditionalServiceSuggestionPage.tsx` | `GET/PATCH /api/additional-service-proposals` |
| `/advisor/quality-check` | `QualityVerificationPage` | `frontend/src/pages/advisor/QualityVerificationPage.tsx` | `POST /api/repair-orders/:id/quality-check`, `/forward-to-accountant` |
| `/advisor/transfer-requests` | `TransferRequestReviewPage` | `frontend/src/pages/advisor/TransferRequestReviewPage.tsx` | `GET /api/transfer-requests`, `/:id/approve`, `/:id/reject` |
| `/advisor/profile` | `ServiceAdvisorProfilePage` | `frontend/src/pages/advisor/ServiceAdvisorProfilePage.tsx` | `GET/PUT /api/auth/me` |

Post-login landing: `/advisor/dashboard`. Shell: `frontend/src/widgets/service-advisor-shell/ui/ServiceAdvisorShell.tsx`.

### `technician`

| Path | Component | File | Backend counterpart |
|------|-----------|------|---------------------|
| `/technician/work-orders` | `TechnicianWorkOrdersPage` | `frontend/src/pages/technician/TechnicianWorkOrdersPage.tsx` | `GET /api/repair-orders?technicianId=`, `PATCH /:id/progress` |
| `/technician/repair-notes` | `TechnicianRepairNotesPage` | `frontend/src/pages/technician/TechnicianRepairNotesPage.tsx` | `POST /api/repair-orders/:id/step-notes` (multipart) |
| `/technician/profile` | `TechnicianProfilePage` | `frontend/src/pages/technician/TechnicianProfilePage.tsx` | `GET/PUT /api/auth/me` |

Post-login landing: `/technician/work-orders`. Shell: `frontend/src/widgets/technician-shell/ui/TechnicianShell.tsx`.

### `accountant`

| Path | Component | File | Backend counterpart |
|------|-----------|------|---------------------|
| `/accountant/invoices` | `InvoiceManagementPage` | `frontend/src/pages/accountant/invoices/ui/InvoiceManagementPage.tsx` | `GET /api/invoices`, `PATCH /:id/send` |
| `/accountant/invoices/confirm` | `InvoiceConfirmPage` | `frontend/src/pages/accountant/confirm/ui/InvoiceConfirmPage.tsx` | `POST /api/invoices` (generate from repair order) |
| `/accountant/payments` | `PaymentsPage` | `frontend/src/pages/accountant/payments/ui/PaymentsPage.tsx` | `GET/POST /api/payments` |
| `/accountant/audit` | `AuditTrailPage` | `frontend/src/pages/accountant/audit/ui/AuditTrailPage.tsx` | `GET /api/audit-logs` |
| `/accountant/profile` | `AccountantProfilePage` | `frontend/src/pages/accountant/profile/ui/AccountantProfilePage.tsx` | `GET/PUT /api/auth/me` |

Post-login landing: `/accountant/invoices`. Shell: `frontend/src/pages/accountant/ui/AccountantShell.tsx`. Shared API module: `frontend/src/pages/accountant/api/accountantApi.ts`.

### `admin`

| Path | Component | File | Backend counterpart |
|------|-----------|------|---------------------|
| `/admin/dashboard` | `AdminDashboardPage` | `frontend/src/pages/admin/dashboard/ui/AdminDashboardPage.tsx` | `GET /api/admin/stats/summary`, `/stats/daily-intake` |
| `/admin/users` | `AdminUsersPage` | `frontend/src/pages/admin/users/ui/AdminUsersPage.tsx` | `GET /api/admin/users`, `POST /api/auth/staff`, `PATCH /users/:id/deactivate` |
| `/admin/services` | `AdminServicesPage` | `frontend/src/pages/admin/services/ui/AdminServicesPage.tsx` | `/api/admin/services`, `/services/categories` |
| `/admin/parts` | `AdminPartsPage` | `frontend/src/pages/admin/parts/ui/AdminPartsPage.tsx` | `/api/admin/parts` |
| `/admin/reports` | `AdminReportsPage` | `frontend/src/pages/admin/reports/ui/AdminReportsPage.tsx` | `GET /api/admin/reports/revenue`, `/reports/technicians` |
| `/admin/config` | `AdminConfigPage` | `frontend/src/pages/admin/config/ui/AdminConfigPage.tsx` | `frontend/src/pages/admin/config/api/configApi.ts` |
| `/admin/profile` | `AdminProfilePage` | `frontend/src/pages/admin/profile/ui/AdminProfilePage.tsx` | `GET/PUT /api/auth/me` |

Post-login landing: `/admin/dashboard`. Shell: `frontend/src/pages/admin/ui/AdminShell.tsx`.

## Backend API Path Map

Mounted in `backend/src/routes/index.js`, all under `/api`:

| Prefix | Router file | Domain |
|--------|-------------|--------|
| `/api/auth` | `auth.routes.js` | register/login/me/staff/OTP password reset |
| `/api/bookings` | `booking.routes.js` | slots, create, confirm, status, cancel, reschedule |
| `/api/receptions` | `reception.routes.js` | front-desk intake + plate history |
| `/api/inspection-reports` | `inspection-report.routes.js` | inspections (multipart photos) |
| `/api/quotations` | `quotation.routes.js` | draft/send/confirm quotes |
| `/api/repair-orders` | `repair-order.routes.js` | orders, progress, step notes, QC, forward-to-accountant |
| `/api/additional-service-proposals` | `additional-service.routes.js` | technician extra-work proposals |
| `/api/transfer-requests` | `transfer-request.routes.js` | technician handoffs |
| `/api/schedules` | `schedule.routes.js` | technician daily capacity |
| `/api/invoices` | `invoice.routes.js` | generate/list/send invoices, `/mine` |
| `/api/payments` | `payment.routes.js` | record/list payments |
| `/api/audit-logs` | `audit-log.routes.js` | billing audit trail |
| `/api/reviews` | `review.routes.js` | customer ratings |
| `/api/notifications` | `notification.routes.js` | in-app notifications |
| `/api/vehicles` | `vehicle.routes.js` | plate existence check, create |
| `/api/tracking` | `tracking.routes.js` | **public** repair status lookup |
| `/api/services`, `/api/admin/services` | `service.routes.js` | catalog + categories (same router, two mounts) |
| `/api/admin/parts` | `part.routes.js` | parts catalog (admin-only router-level guard) |
| `/api/admin` | `admin.routes.js` | users, stats, revenue/technician reports |
| `/api/advisor` | `advisor.routes.js` | SA dashboard aggregate |
| `/api/health` | `backend/src/app.js` | liveness + DB status |

## Naming Conventions

**Backend files:** kebab-case with a layer suffix — `<domain>.<layer>.js`.
- `repair-order.routes.js`, `repair-order.controller.js`, `repair-order.service.js`, `repair-order.repository.js`, `repair-order.model.js`
- Tests mirror the source name: `backend/tests/unit/repair-order.service.test.js`, `backend/tests/integration/repair-order.routes.test.js`
- Utils are camelCase single-purpose files: `catchAsync.js`, `apiError.js`, `paymentGateway.js`

**Backend exports:**
- Models: `export const RepairOrderModel` + `export const REPAIR_ORDER_STATUSES`
- Repositories: `export const repairOrderRepository`
- Services/controllers: named `export async function` per operation (no default exports)

**Frontend files:**
- Components/pages: PascalCase `.tsx` — `InvoiceManagementPage.tsx`, `BackOfficeShell.tsx`
- Hooks/libs/API modules: camelCase `.ts` — `useApiMessage.ts`, `accountantApi.ts`, `api-client.ts` (kebab-case is used for a few `shared/lib` files)
- Slice folders: kebab-case — `pages/accountant/invoices/`, `widgets/notification-center/`
- Barrels: `index.ts` re-exporting the public surface of a slice

**Frontend directories:** FSD-style segments inside each slice — `ui/`, `api/`, `model/`, `lib/`.

## Where to Add New Code

**New backend endpoint (existing domain):**
1. Handler logic → `backend/src/services/<domain>.service.js` (new exported function, guard clauses first, `throw new ApiError(...)`)
2. HTTP adapter → `backend/src/controllers/<domain>.controller.js`
3. Route + guards → `backend/src/routes/<domain>.routes.js`
4. Unit test → `backend/tests/unit/<domain>.service.test.js`
5. Integration test → `backend/tests/integration/<domain>.routes.test.js`

**New backend domain:**
1. `backend/src/models/<domain>.model.js` + add the export line to `backend/src/models/index.js`
2. `backend/src/repositories/<domain>.repository.js` → `export const xRepository = createRepository(XModel);`
3. `backend/src/services/<domain>.service.js`, `backend/src/controllers/<domain>.controller.js`, `backend/src/routes/<domain>.routes.js`
4. Mount it in `backend/src/routes/index.js`
5. Both test files under `backend/tests/`

**New status value / state transition:** edit the enum in `backend/src/models/<domain>.model.js`, then the transition guard in the matching service, then the TS union in the relevant `frontend/src/**/api/*.ts` or `frontend/src/shared/api/workshop.ts`.

**New frontend page (sliced areas — customer/admin/accountant):**
- Component → `frontend/src/pages/<area>/<screen>/ui/<Screen>Page.tsx`
- Barrel → `frontend/src/pages/<area>/<screen>/index.ts`
- API calls → `frontend/src/pages/<area>/<screen>/api/<screen>Api.ts` or the area-wide `frontend/src/pages/<area>/api/<area>Api.ts`
- Route → lazy import + guarded `<Route>` in `frontend/src/app/App.tsx`

**New frontend page (advisor/technician):** follow the existing flat convention — a single `frontend/src/pages/advisor/<Name>Page.tsx` (or `pages/technician/`) plus the route entry in `App.tsx`.

**New cross-page UI:** `frontend/src/widgets/<widget-name>/ui/<Component>.tsx` with an `index.ts` barrel; put hooks under `lib/` and constants under `model/`.

**New shared UI primitive / DTO type:** `frontend/src/shared/ui/…` and `frontend/src/shared/api/workshop.ts` respectively.

**Never add:** a new `fetch(` outside `frontend/src/shared/lib/api-client.ts`, a model import outside `backend/src/repositories/` (exception: `backend/src/utils/notify.js`), or business logic in a controller.

## Special Directories

**`frontend/public/kapa-auth/`:**
- Purpose: cloned WordPress ("Kapa") theme HTML/CSS/JS for the public marketing and auth pages, consumed at runtime by `frontend/src/shared/lib/kapa-template/useClonedKapaPage.ts`.
- Generated: No (hand-cloned).
- Committed: Yes. Editing these HTML files changes live public pages.
- Caveat: the theme's `kapa-main.js` initializes a `niceSelect` widget that freezes native React `<select>` elements in template slots — neutralized with a `MutationObserver` in the React layer.

**`frontend/dist/`:**
- Purpose: Vite production build output.
- Generated: Yes (`npm run build`).
- Committed: Yes (present in the repo) — never hand-edit; rebuild instead.

**`frontend/public/external/`:**
- Purpose: self-hosted `fonts.googleapis.com` / `fonts.gstatic.com` mirrors so the cloned theme renders offline.
- Generated: No. Committed: Yes.

**`backend/scripts/`:**
- Purpose: operational one-offs run manually with `node scripts/<name>.js`; not imported by `src/`.
- Committed: Yes.

**`clone-2/`:**
- Purpose: cloned reference material outside both build pipelines. Do not add product code here.

**`test/` (repo root):**
- Purpose: Excel test-case workbooks (course deliverables). Distinct from the executable suites in `backend/tests/`.

**`node_modules/`, `frontend/node_modules/`:** dependencies; not committed.

---

*Structure analysis: 2026-07-23*
