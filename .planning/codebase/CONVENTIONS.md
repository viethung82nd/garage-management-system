# Coding Conventions

**Analysis Date:** 2026-07-23

No linter or formatter is configured anywhere in this repo (no `.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `biome.json`, or `.editorconfig` in the root, `backend/`, or `frontend/`). Every convention below is enforced by convention only — follow the existing files.

---

## Naming Patterns

### Backend files (`backend/src/`)

Every backend file is `kebab-case` with a layer suffix. The domain noun is identical across layers so the five files for one domain line up:

| Layer | Pattern | Example |
|-------|---------|---------|
| Route | `<domain>.routes.js` | `backend/src/routes/reception.routes.js` |
| Controller | `<domain>.controller.js` | `backend/src/controllers/reception.controller.js` |
| Service | `<domain>.service.js` | `backend/src/services/reception.service.js` |
| Repository | `<domain>.repository.js` | `backend/src/repositories/vehicle.repository.js` |
| Model | `<domain>.model.js` | `backend/src/models/vehicle.model.js` |
| Validator | `<domain>.validator.js` | `backend/src/validators/auth.validator.js` |
| Middleware | `<name>.middleware.js` | `backend/src/middlewares/auth.middleware.js` |
| Util | `camelCase.js` or single word | `backend/src/utils/apiError.js`, `backend/src/utils/catchAsync.js` |

Multi-word domains keep the hyphen: `repair-order.service.js`, `inspection-report.controller.js`, `additional-service.routes.js`, `transfer-request.repository.js`.

### Backend exports

| Thing | Convention | Example |
|-------|-----------|---------|
| Router | `export const <domain>Router = Router()` | `export const receptionRouter` in `backend/src/routes/reception.routes.js` |
| Controller handler | `export async function <verbNoun>(req, res)` | `export async function createReception(req, res)` |
| Service function | `export async function <verbNoun>(...)` | `export async function createReception(payload, advisorId)` |
| Repository | `export const <domain>Repository = createRepository(Model)` | `backend/src/repositories/vehicle.repository.js` |
| Mongoose model | `export const <Domain>Model = mongoose.model("Domain", schema)` | `export const VehicleModel` |
| Enum arrays on models | `SCREAMING_SNAKE_CASE` | `USER_ROLES`, `ACCOUNT_TYPES` in `backend/src/models/user.model.js` |
| Module-scope regex/config | `SCREAMING_SNAKE_CASE` | `OID_RE`, `VIN_RE` in `backend/src/services/reception.service.js`; `SLOT_CAPACITY` in `backend/src/config/constants.js` |

**Named exports only.** There is no `export default` anywhere in `backend/src/`. Never introduce one.

### Backend model conventions

- Schema variable is lowercase (`const vehicleSchema = new Schema({...})`), model export is `PascalCase` + `Model`.
- Mongoose collection name comes from `mongoose.model("Vehicle", ...)` — singular PascalCase string.
- Always pass `{ timestamps: true }` (see `backend/src/models/user.model.js`) — `vehicle.model.js` uses the explicit `{ timestamps: { createdAt: true, updatedAt: true } }` form; either is acceptable, prefer `{ timestamps: true }`.
- References use `{ type: Schema.Types.ObjectId, ref: "User" }` and the field is named `<thing>Id` (`customerId`, `advisorId`, `repairOrderId`, `vehicleId`). Populated results keep the same key, so the frontend types model those fields as `string | object`.
- Sensitive fields are stripped with a `toJSON` transform on the schema, not in the service. See `backend/src/models/user.model.js` deleting `passwordHash`.
- New models must be re-exported from `backend/src/models/index.js` — everything imports models from that barrel, never from the individual file.

### Backend route paths

Routers mount under a plural kebab-case resource in `backend/src/routes/index.js`: `/api/repair-orders`, `/api/inspection-reports`, `/api/transfer-requests`, `/api/additional-service-proposals`, `/api/audit-logs`. Role-scoped areas use a role prefix instead: `/api/admin`, `/api/admin/services`, `/api/admin/parts`, `/api/advisor`.

### Frontend files (`frontend/src/`)

| Thing | Convention | Example |
|-------|-----------|---------|
| React component file | `PascalCase.tsx`, one component per file | `frontend/src/pages/accountant/payments/ui/PaymentsPage.tsx` |
| Page component | Suffix `Page` | `AdminReportsPage`, `CustomerTrackingPage` |
| API module | `<feature>Api.ts` (camelCase) | `frontend/src/pages/admin/users/api/usersApi.ts` |
| Hook | `use<Thing>.ts` | `frontend/src/shared/lib/kapa-template/useClonedKapaPage.ts` |
| Plain lib/helper | `camelCase.ts` | `frontend/src/pages/customer/tracking/lib/mapTrackingRecord.ts` |
| Barrel | `index.ts` | every feature folder |
| Directory | `kebab-case` | `pages/contact-us/`, `widgets/backoffice-shell/`, `shared/ui/kapa-customer/` |
| API response type | `Api<Thing>` or `<Thing>ApiRecord` | `ApiRepairOrder` in `shared/api/workshop.ts`; `AdminUserRecord`, `InvoiceApiRecord` |
| Request payload type | `<Verb><Thing>Payload` | `CreateStaffPayload` in `usersApi.ts` |

---

## Layering Contract (backend)

```
routes/  →  controllers/  →  services/  →  repositories/  →  models/
   ↑            ↑                ↑
middlewares  (thin)      (all business logic)
validators/
```

**Route layer** (`backend/src/routes/*.routes.js`) — declares HTTP method + path, chains middleware, wraps the controller in `catchAsync`. No logic. Canonical shape, from `backend/src/routes/reception.routes.js`:

```js
import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { catchAsync } from "../utils/catchAsync.js";
import { createReception } from "../controllers/reception.controller.js";

export const receptionRouter = Router();

receptionRouter.post(
  "",
  requireAuth,
  requireRole("serviceAdvisor", "admin"),
  catchAsync(createReception),
);
```

Every one of the 20 domain routers wraps handlers in `catchAsync`. Then register the router in `createApiRouter()` in `backend/src/routes/index.js`.

**Controller layer** (`backend/src/controllers/*.controller.js`) — unwraps `req` into plain arguments, calls exactly one service function, picks the status code. Nothing else. From `backend/src/controllers/reception.controller.js`:

```js
import * as receptionService from "../services/reception.service.js";

export async function createReception(req, res) {
  const result = await receptionService.createReception(req.body ?? {}, req.user.sub);
  res.status(201).json(result);
}
```

Rules the codebase holds to without exception:
- Import the service as a namespace: `import * as xService from "../services/x.service.js"`.
- Always guard the body with `req.body ?? {}`.
- Identity comes from the JWT as `req.user.sub` and `req.user.role` — never from the body.
- `res.json(result)` for 200, `res.status(201).json(result)` for creates.
- **Controllers never import repositories or models.** Verified: zero matches for `repositories/` or `models/` under `backend/src/controllers/`.
- No `try/catch` in controllers — `catchAsync` at the route plus the central error handler cover it.

**Service layer** (`backend/src/services/*.service.js`) — all business logic, validation, orchestration, and serialization. Takes plain values, returns plain data, throws `ApiError`. Services may import other services when the logic is genuinely shared (`reception.service.js` imports `resolveCustomer`/`resolveVehicle` from `booking.service.js`).

**Repository layer** (`backend/src/repositories/*.repository.js`) — one line per domain, built with the factory in `backend/src/repositories/base.repository.js`:

```js
import { VehicleModel } from "../models/index.js";
import { createRepository } from "./base.repository.js";

export const vehicleRepository = createRepository(VehicleModel);
```

The factory exposes `findById`, `findOne`, `find`, `create`, `updateById`, `deleteById`, `countDocuments`, `exists`, `aggregate`, plus `.model` as a deliberate escape hatch for populate/sort/limit chains. Use `.model` for ad-hoc chains rather than importing the model:

```js
const vehicle = await vehicleRepository.model
  .findOne({ licensePlate: plate.toUpperCase() })
  .populate("customerId", "fullName phone email");
```

**Known deviation:** 8 services still import models directly instead of going through the repository — `additional-service`, `admin`, `audit-log`, `auth`, `booking`, `payment`, `repair-order`, `transfer-request`. Prefer `<domain>Repository.model` in new code.

**`sendResponse` is dead code.** `backend/src/utils/apiResponse.js` exports `sendResponse(res, status, payload)` but nothing imports it. Controllers call `res.json` / `res.status().json()` directly. Do not adopt it for one endpoint — either use it everywhere or leave it alone.

---

## Error Handling

### `ApiError` (`backend/src/utils/apiError.js`)

```js
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
```

Throw it from the service layer with an HTTP status and a user-facing message. Message strings are plain English sentences shown directly in the UI, e.g. `throw new ApiError(400, "VIN must contain exactly 17 uppercase letters and numbers (excluding I, O and Q)")`.

Status codes used consistently across services: `400` invalid input, `401` unauthenticated, `403` wrong role, `404` not found, `409` state conflict (e.g. `"This booking has already been received"`).

### `catchAsync` (`backend/src/utils/catchAsync.js`)

```js
export function catchAsync(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
```

Applied at the route layer, around every controller. Without it an async rejection hangs the request.

### Central handler (`backend/src/middlewares/error.middleware.js`)

`errorHandler` is mounted last in `backend/src/app.js`, after `notFound`. It maps:

| Condition | Status | Body |
|-----------|--------|------|
| `err instanceof ApiError` | `err.status` | `{ error: err.message }` |
| Mongoose `ValidationError` / `CastError` | 400 | `{ error: err.message }` |
| `err.code === 11000` (duplicate key) | 409 | `{ error: "Resource already exists" }` |
| anything else | 500 | `{ error: "Internal server error" }` (stack logged) |

**Error response shape is always `{ error: "<message>" }`.** The frontend `ApiClientError` in `frontend/src/shared/lib/api-client.ts` reads `payload.error` first, then `payload.message`. Never return a different error envelope.

Success responses are **not** enveloped — controllers return the raw domain payload. `backend/src/utils/apiResponse.js` documents this explicitly: "Deliberately does NOT wrap payloads in an envelope (`{ data: ... }`) — existing endpoints return raw bodies and the frontend depends on those exact shapes."

### Best-effort side effects

Notifications, emails, and audit logging must never break the business action that triggered them. Wrap in try/catch and swallow with a `console.warn`. See `logAudit` in `backend/src/utils/audit.js` and `createNotification` in `backend/src/utils/notify.js`.

---

## Validation

There is **no schema library** — no Joi, no Zod, no express-validator. Two mechanisms exist.

### 1. Route-level validators (`backend/src/validators/`)

A validator is a pure function `(body) => string | null`: return an error message to reject with 400, return `null` to pass. From `backend/src/validators/auth.validator.js`:

```js
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function validateRegisterBody({ fullName, email, password } = {}) {
  if (!fullName || !fullName.trim()) return "fullName is required";
  if (!email || !EMAIL_RE.test(email)) return "A valid email is required";
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  return null;
}
```

Wired with `validateBody` from `backend/src/middlewares/validate.middleware.js`, which responds `400 { error }` on failure. Keeping validators as plain functions means they are testable without Express.

**Current reach: `backend/src/validators/auth.validator.js` is the only validator file**, used only by `backend/src/routes/auth.routes.js`. Everything else validates inside the service.

### 2. Service-level guards (the dominant pattern)

Services validate defensively at the top of the function and throw `ApiError(400, ...)`. Field-order convention seen in `backend/src/services/reception.service.js`: required-presence checks first, then format checks, then normalization, then DB work. Section comments delimit the groups:

```js
// ===== Customer validation =====
if (!customerName?.trim()) throw new ApiError(400, "Customer name is required");
...
// ===== VIN validation =====
let normalizedVin = vin.trim().toUpperCase();
if (!VIN_RE.test(normalizedVin)) throw new ApiError(400, "VIN must contain exactly 17 ...");
```

Format regexes are module-scope constants: `OID_RE = /^[0-9a-fA-F]{24}$/` for ObjectId strings, `VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/`, phone `/^0\d{9}$/`.

**Third line of defence:** Mongoose schema constraints (`required`, `enum`, `unique`, `min`, `trim`, `uppercase`, `lowercase`) — schema failures are translated to 400/409 by the error middleware, so you don't have to duplicate every check.

**When adding a new endpoint:** validate in the service (that's where tests live and where the walk-in/booking paths converge). Add a `<domain>.validator.js` only when you want the request rejected before touching the DB.

---

## Comment Style

This repo uses **long explanatory "why" comments**, not "what" comments. 218 JSDoc blocks across 127 files / ~8,600 lines of `backend/src`. Match this density — it is the strongest convention in the codebase.

**Every exported function gets a JSDoc block explaining its purpose in prose**, often several sentences long, describing the business reason and the downstream consequence. From `backend/src/services/reception.service.js`:

```js
/**
 * Service Advisor receives a vehicle at the front desk, either from a
 * confirmed booking (bookingId provided) or as a walk-in (no bookingId).
 * Reuses the same find-or-create logic as public booking creation for the
 * customer/vehicle, then always opens a RepairOrder "shell" (no services yet)
 * — this is the single spine record every later stage (inspection,
 * quotation, assignment, quality check, invoicing) attaches to via its
 * repairOrderId, carried through the SA UI as a ?orderId= param.
 */
```

**Non-obvious decisions carry a rationale comment naming the failure mode avoided.** Examples to imitate:

- `backend/src/repositories/base.repository.js` — why a factory instead of hand-written CRUD, and why `.model` is exposed.
- `backend/src/config/env.js` — why Cloudinary vars are `optional()` and not `required()`.
- `backend/src/services/invoice.service.js` — why `services.serviceId` must be in `invoicePopulate` ("without this, serviceId stays an unpopulated ObjectId and every line silently falls back to 'no category'").
- `frontend/src/shared/lib/api-client.ts` — why `Content-Type` is left unset for `FormData` ("setting it manually here silently breaks multer parsing on the backend").
- `frontend/src/styles.css` — a 9-line comment explaining the `@source not "../public/kapa-auth"` Tailwind exclusion.

**Structural comments** use `// ===== Section name =====` inside long service functions.

**Types are documented with `@param` object literals** where JSDoc adds value (`backend/src/utils/notify.js`, `backend/src/utils/audit.js`). Backend is plain JS with no `checkJs`, so JSDoc types are documentation only.

Do not add comments that restate the code. Do not delete an existing rationale comment when refactoring the code it explains — update it.

---

## Code Style

### Backend

- ESM throughout (`"type": "module"` in `backend/package.json`). Every relative import **must** carry the `.js` extension: `import { ApiError } from "../utils/apiError.js"`.
- Double quotes, semicolons, 2-space indent, trailing commas in multi-line calls.
- `async/await` only; no `.then()` chains.
- Optional chaining and `??` are used liberally for defensive access (`req.body ?? {}`, `customerName?.trim()`, `order.stepNotes?.at(-1)?.content`).
- Import order in service files: mongoose → repositories → other services → utils. See `backend/src/services/invoice.service.js`.

### Frontend

TypeScript strict mode is **off** — `frontend/tsconfig.json` has no `"strict": true`. It does enable `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Consequences you must respect:
- `verbatimModuleSyntax` means type-only imports **must** use `import type { X } from '...'` or inline `type` specifiers — a plain `import { SomeType }` will fail the build.
- `noUnusedLocals`/`noUnusedParameters` are build-breaking (`npm run build` runs `tsc && vite build`); prefix intentionally-unused params with `_`.
- `erasableSyntaxOnly` forbids enums and parameter properties. Use `as const` objects and union types instead (see `frontend/src/shared/config/theme.ts`).

**Two quote/semicolon dialects coexist.** Match the file you are editing:

| Dialect | Style | Where |
|---------|-------|-------|
| A | single quotes, **no** semicolons | `src/app/**`, `src/main.tsx`, `src/shared/**`, `src/pages/admin/**`, `src/pages/accountant/**`, `src/widgets/**` |
| B | double quotes, semicolons | `src/pages/advisor/**`, `src/pages/customer/**`, `src/pages/technician/**` |

No path aliases are configured in `frontend/vite.config.ts` or `tsconfig.json` — all cross-folder imports are deep relative paths, four levels up from a page's `ui/` folder: `import { apiRequest } from '../../../../shared/lib/api-client'`.

---

## Frontend Page Layout

The frontend is a partial Feature-Sliced Design layout. `src/entities/`, `src/features/`, `src/app/providers/`, and `src/app/router/` exist but contain only `.gitkeep` — **do not** start populating them; the live layers are `app/`, `pages/`, `widgets/`, `shared/`.

### Standard role-page structure

`pages/<role>/<feature>/{api,ui,model,lib}` with barrels at each level. Canonical example, `frontend/src/pages/accountant/`:

```
pages/accountant/
├── index.ts                       # re-exports every feature's page component
├── api/accountantApi.ts           # role-wide API module
├── model/mock.ts                  # shared types + mock/demo data
├── ui/AccountantShell.tsx         # role layout shell
├── invoices/
│   ├── index.ts                   # export { default as InvoiceManagementPage } from './ui/InvoiceManagementPage'
│   └── ui/InvoiceManagementPage.tsx
├── payments/{index.ts, ui/PaymentsPage.tsx}
├── audit/{index.ts, ui/AuditTrailPage.tsx}
└── profile/{index.ts, ui/AccountantProfilePage.tsx}
```

Folder roles:
- `api/` — thin typed wrappers over `apiRequest`. Types + functions only, no React.
- `ui/` — React components. Page component is `export default`, re-exported as a **named** export by the feature `index.ts`.
- `model/` — types, mock/demo data, view-model shapes (`frontend/src/pages/customer/model/mock.ts`).
- `lib/` — pure mapping/transform helpers (`frontend/src/pages/customer/tracking/lib/mapTrackingRecord.ts`).

Barrel convention: feature `index.ts` does `export { default as XPage } from './ui/XPage'`; the role `index.ts` re-exports named page components; `frontend/src/app/App.tsx` imports from the role barrel only.

`pages/admin/`, `pages/accountant/`, `pages/customer/`, `pages/auth/`, `pages/appointment/` all follow this.

**Deviation:** `pages/advisor/` and `pages/technician/` are flat — page components sit directly in the folder (`frontend/src/pages/advisor/QuotationPage.tsx`, 1,263 lines) with no `api/`/`ui/`/`model/` split, and they call the shared 536-line `frontend/src/shared/api/workshop.ts` instead of a local `api/` module. New advisor/technician work should move toward the folder layout.

### API client usage

All HTTP goes through `apiRequest<T>` in `frontend/src/shared/lib/api-client.ts`. Never call `fetch` directly from a component.

```ts
import { apiRequest } from '../../../../shared/lib/api-client'

export function fetchAdminUsers(token: string) {
  return apiRequest<{ users: AdminUserRecord[] }>('/api/admin/users', { token })
}

export function createStaffAccount(token: string, payload: CreateStaffPayload) {
  return apiRequest<{ user: AdminUserRecord }>('/api/auth/staff', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}
```

Rules:
- Pass the JWT as the custom `token` option — `apiRequest` turns it into `Authorization: Bearer <token>`. Do not hand-build the header.
- `body: JSON.stringify(payload)`; for uploads pass a raw `FormData` and let the client omit `Content-Type`.
- The path argument is the full `/api/...` path; `API_BASE_URL` (from `VITE_API_BASE_URL`, default `http://localhost:4000`) is prepended.
- The type parameter must mirror the backend's raw body — there is no `{ data }` envelope.
- Errors arrive as `ApiClientError` with `.status` and `.message`. Catch it and branch on status; a network failure surfaces as `status: 0` with a connection message. Pattern in `frontend/src/pages/customer/tracking/ui/CustomerTrackingPage.tsx`: 404 → "no record" empty state, anything else → error banner.
- Use `resolveApiAssetUrl(path)` from the same module for backend-relative upload URLs.

Auth state comes from `useAuth()` (`frontend/src/shared/auth/`); route protection uses `<RequireAuth>` and `<RequireRole roles={[...]}>` from `frontend/src/app/route-guards.tsx`.

### Styling approach

Four layers coexist. Pick by surface:

1. **Cloned Kapa WordPress/Elementor theme** — static HTML exports live in `frontend/public/kapa-auth/**` and are fetched and injected verbatim at runtime by the hooks in `frontend/src/shared/lib/kapa-template/` (`useClonedKapaPage`, `parseTemplatePage`, `rewriteKapaRouteLinks`, `pruneKapaNavbar`, `useMountKapaNavbarWidgets`). Public marketing pages (`pages/home-five`, `pages/our-brands`, `pages/contact-us`, `pages/services`, `pages/appointment`, `pages/auth`) are React shells that mount into slots in that cloned markup. Consequences:
   - The theme ships Bootstrap-style grid classes; customer pages use them directly (`className="row align-items-start g-4"`, `col-lg-6`).
   - `frontend/src/styles.css` sets `@source not "../public/kapa-auth"` so Tailwind does not scan theme HTML and generate conflicting same-named utilities (`mt-80` etc.) — never remove that line.
   - The theme's `kapa-main.js` initializes niceSelect over React-owned `<select>` elements in template slots and freezes them; that is neutralized with a MutationObserver. Be careful adding native form controls inside cloned markup.
2. **`frontend/src/styles.css`** (2,235 lines) — global CSS plus the hand-written `customer-*` component classes used by the customer surface (`customer-section`, `customer-tracking-form-card`).
3. **Ant Design** (`antd` v6 + `@ant-design/icons`) — the entire back-office (admin, accountant, advisor, technician). Tables, Forms, Modals, Tags. Palette constants are exported next to the shell, e.g. `adminPalette` from `frontend/src/pages/admin/ui/AdminShell.tsx`.
4. **Tailwind v4** (`@tailwindcss/vite`) — utility classes for layout tweaks, mostly in `app/` and shells.

Design tokens live in `frontend/src/shared/config/theme.ts` (`as const` object: `theme.color.primary` `#f51304`, `theme.fontFamily.body` `"Spartan"`, `theme.fontFamily.display` `"Oswald"`) with the CSS-variable twin in `frontend/src/shared/config/theme.css`. Import `theme` for inline styles rather than hardcoding hex values. Do not swap fonts per section.

Reusable presentational components live in `frontend/src/shared/ui/`: `kapa-chrome/` (navbar/footer/banner for public pages), `kapa-customer/` (the `Customer*` component family), `invoice/InvoiceDocument.tsx`. Cross-role shells live in `frontend/src/widgets/` (`backoffice-shell`, `service-advisor-shell`, `technician-shell`, `notification-center`, `appointment-booking`).

---

## Logging

**Backend:** use `logger` from `backend/src/utils/logger.js` — `logger.info(scope, ...args)`, `.warn`, `.error`, which prints `[scope] message`. `backend/src/middlewares/logger.middleware.js` already logs one line per request (`[req] POST /api/receptions 201 12.3ms`), so do not log request entry/exit in handlers. Only `>= 500` errors are logged by `errorHandler`. Raw `console.warn` appears in the best-effort helpers (`utils/audit.js`, `utils/notify.js`) with a `[scope]` prefix.

**Frontend:** no logging framework. Errors surface as UI state (banner/message), not console noise.

---

## Configuration

Environment access is centralized in `backend/src/config/env.js`. Never read `process.env` outside it. Use `required(name)` for anything the app cannot boot without (fails fast at startup) and `optional(name, fallback)` for feature-gated integrations. `backend/.env` and `frontend/.env` exist and are gitignored; `.env.example` is committed in both.

Frontend env vars must be `VITE_`-prefixed and are read via `import.meta.env` — currently only `VITE_API_BASE_URL` in `frontend/src/shared/lib/api-client.ts`.

Tunable business constants go in `backend/src/config/constants.js` (slot hours, `SLOT_CAPACITY`, `ACTIVE_BOOKING_STATUSES`) or as a module-scope constant at the top of the owning service (`INVOICE_TERM_DAYS = 15` in `backend/src/services/invoice.service.js`).

---

## Function and Module Design

**Backend services** take a destructured options object as the first parameter and scalar identity as the second: `createReception({ bookingId, customerName, ... }, advisorId)`. Return plain objects containing the touched documents (`{ customer, vehicle, repairOrder, booking }`) — the controller passes them straight to `res.json`.

Service files that shape responses keep private `serialize*`/`format*` helpers at module scope, above the exported functions, and do not export them (`serializePayment`, `formatDisplayId` in `backend/src/services/invoice.service.js`). Shared populate specs are module-scope arrays (`invoicePopulate`).

**Frontend** page components are large single-file components (several exceed 700 lines; `QuotationPage.tsx` is 1,263). New work should extract typed API calls into `api/` and pure transforms into `lib/` rather than growing the component further.

**Barrels:** used everywhere on the frontend (`index.ts` per feature/folder) and for backend models (`backend/src/models/index.js`) and routes (`backend/src/routes/index.js`). Backend controllers/services/repositories have no barrel — import the specific file.

---

*Convention analysis: 2026-07-23*
