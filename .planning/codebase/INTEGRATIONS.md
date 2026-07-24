# External Integrations

**Analysis Date:** 2026-07-23

**Summary — what is real vs. mocked:**

| Integration | Status | Where |
|-------------|--------|-------|
| MongoDB (Mongoose) | **Real** | `backend/src/config/db.js` |
| Cloudinary image hosting | **Real** (SDK call, needs credentials; throws 500 without them) | `backend/src/utils/cloudinary.js` |
| SMTP email (nodemailer) | **Real** (silently skipped + console warning if unconfigured) | `backend/src/utils/mailer.js` |
| Payment gateway | **MOCK — no real provider** | `backend/src/utils/paymentGateway.js` |
| OTP delivery | **STUB — `console.log` only, never sent to the user** | `backend/src/utils/otp.js` |
| Notifications | **Real but in-app only** (DB rows, polled by client); no push/SMS | `backend/src/utils/notify.js` |
| JWT auth | **Real** (self-issued HS256, no external IdP) | `backend/src/utils/jwt.js` |
| Google Fonts | **Real** (CDN `<link>` in the SPA shell) | `frontend/index.html` |
| PDF / CSV export | **Real, fully client-side** — no external service | `frontend/src/shared/lib/pdf-export.ts`, `csv-export.ts` |

There are **no outbound HTTP calls to any third-party REST API anywhere in
`backend/src`** other than those made internally by the Cloudinary and
nodemailer SDKs. No SMS provider, no maps/geocoding, no analytics, no error
tracking.

## APIs & External Services

**Image hosting — Cloudinary (REAL):**
- SDK: `cloudinary` 2.10.0, `v2` API.
- Wrapper: `backend/src/utils/cloudinary.js` → `uploadBufferToCloudinary(buffer, folder)` streams a multer memory buffer to `cloudinary.uploader.upload_stream` and returns the hosted result (public HTTPS URL).
- Configured lazily: `isConfigured` is computed at module load from `env.cloudinary.*`. If any of the three vars is blank, uploads throw `ApiError(500, "Photo upload is not configured: ...")` — the rest of the app still boots and runs.
- Credentials: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (read in `backend/src/config/env.js`, declared in `backend/.env.example`).
- Folders used: `inspection-photos`, `step-note-photos`, `category-photos`.

**Email — SMTP via nodemailer (REAL, optional):**
- SDK: `nodemailer` 9.0.3.
- Wrapper: `backend/src/utils/mailer.js` → `sendEmail({ to, subject, html })`.
- Transport is created lazily and cached; timeouts hard-capped at 10s each (`connectionTimeout`, `greetingTimeout`, `socketTimeout`) so a stalled SMTP server cannot hang a request.
- **Best-effort by design:** if `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are unset it logs one `[mailer]` warning and returns `false`; on send failure it logs and returns `false`. It never throws, and callers invoke it as `void sendEmail(...).catch(() => {})` (fire-and-forget).
- Credentials: `SMTP_HOST`, `SMTP_PORT` (default 587; 465 ⇒ `secure: true`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (falls back to `SMTP_USER`). Gmail App Password documented in `backend/.env.example`.

**Payment gateway — MOCK ONLY:**
- `backend/src/utils/paymentGateway.js` exports `charge({ amount, method, simulate })`. It is a **hand-written stand-in**, explicitly documented as such ("Stands in for a real provider (VNPay, Stripe, …)"). It `setTimeout`s 10ms, then returns `{ status, gatewayRef: "MOCK-<uuid>", payload: { gateway: "mock", ... } }`.
- Outcome is caller-controlled: `simulate === "fail"` ⇒ `status: "failed"` with `declineReason: "simulated decline"`; anything else ⇒ `"succeeded"`. **`simulate` is passed straight through from the request body** (`backend/src/controllers/payment.controller.js` → `paymentService.recordPayment(req.body ?? {}, ...)`), so any authenticated accountant/admin can force either outcome.
- Consumer: `backend/src/services/payment.service.js` → `recordPayment()`. It creates a `pending` payment first, calls `charge()`, then persists `status`/`gatewayRef`/`gatewayPayload`/`paidAt` and — only on success — increments `invoice.amountPaid` and moves the invoice to `partiallyPaid` or `paid`. Partial payments are supported; over-payment is rejected.
- No card data, no redirect/return URL, no gateway signature verification, no webhook. **Swapping in a real provider means replacing `backend/src/utils/paymentGateway.js` (and adding a webhook/return route) — no caller needs to change.**
- Payment methods are a plain enum, not gateway-driven: `PAYMENT_METHODS = ["cash", "card", "bankTransfer", "eWallet"]` in `backend/src/models/payment.model.js`.

**Google Fonts (REAL, CDN):**
- `frontend/index.html` preconnects to `fonts.gstatic.com` and pulls the `Spartan` and `Oswald` families from `fonts.googleapis.com`.
- A local mirror of those responses also exists at `frontend/public/external/fonts.googleapis.com/` and `frontend/public/external/fonts.gstatic.com/` (produced by the `clone-2/` puppeteer scripts), but `index.html` currently points at the live CDN.

## Data Storage

**Database — MongoDB:**
- Connection: `MONGODB_URI` (required; server refuses to boot without it — `required()` in `backend/src/config/env.js`). `backend/.env.example` shows a MongoDB Atlas `mongodb+srv://` URI.
- Client: Mongoose 8.24.0. Bootstrap and connection-event logging in `backend/src/config/db.js`; `connectDb()` is awaited before the HTTP server listens.
- Health probe: `GET /api/health` returns `{ status: "ok", db: dbStatus() }` (`backend/src/app.js`).
- Tests use `mongodb-memory-server` instead of a real cluster (`backend/tests/setup.js`).

**File storage:**
- Cloudinary only. Multer uses `multer.memoryStorage()` (`backend/src/middlewares/upload.middleware.js`) precisely so nothing is written to local disk — buffers go straight to Cloudinary. Image-only `fileFilter`, 5 MB default cap.
- Upload entry points: `backend/src/routes/inspection-report.routes.js`, `backend/src/routes/repair-order.routes.js` (step-note photos), `backend/src/routes/service.routes.js` (category photos).
- `frontend/src/shared/lib/api-client.ts` deliberately omits `Content-Type` for `FormData` bodies so the browser sets the multipart boundary.

**Caching:**
- None. No Redis, no in-process cache, no CDN layer in front of the API.

## Authentication & Identity

**Provider: custom / self-hosted. No Auth0, Firebase, Clerk, or OAuth provider.**

- **JWT:** `backend/src/utils/jwt.js` — `signAccessToken({ sub, role })` / `verifyAccessToken(token)` using `JWT_SECRET` (required) and `JWT_EXPIRES_IN` (default `7d`). Enforced by `requireAuth` / `requireRole(...)` in `backend/src/middlewares/auth.middleware.js`.
- **Passwords:** bcryptjs, wrapped in `backend/src/utils/password.js`.
- **Roles:** `USER_ROLES` in `backend/src/models/user.model.js` — `onlineCustomer`, `walkInCustomer`, `serviceAdvisor`, `technician`, `accountant`, `admin`. `ACCOUNT_TYPES` = `registered` | `walkIn`.
- **Token storage (client):** `frontend/src/shared/auth/storage.ts` — `localStorage['gms.auth.token']` when "remember me" is on, otherwise `sessionStorage['gms.auth.token.session']`. Attached as `Authorization: Bearer …` by `apiRequest()` in `frontend/src/shared/lib/api-client.ts`. No refresh-token rotation; no httpOnly cookie.

**OTP — STUBBED DELIVERY:**
- Generation and verification are real: `backend/src/utils/otp.js` uses `crypto.randomInt` for a zero-padded 6-digit code, stores only a SHA-256 hash, enforces `OTP_TTL_MS` (10 min) and `MAX_OTP_ATTEMPTS` (5). Persisted in `backend/src/models/otp.model.js`, consumed in `backend/src/services/auth.service.js` (`checkOtp`, `verifyOtp`, `resetPassword`; purposes include `emailVerification` and `passwordReset`).
- **Delivery is not implemented.** `deliverOtp({ email, code, purpose })` does exactly one thing: `console.log(\`[otp] ${purpose} code for ${email}: ${code}\`)`. The code is **never emailed or SMS'd** — it only appears in the backend server log. This is the single biggest gap between the app and a deployable state, and it is independent of the working nodemailer transport (`sendEmail` is *not* wired into the OTP path). Fixing it = calling `sendEmail` from `deliverOtp`.

**Public (unauthenticated) lookup:**
- `GET /api/tracking` — `backend/src/routes/tracking.routes.js`, explicitly no `requireAuth`. Customers look up a repair order by license plate + phone, or by order id.
- `backend/src/models/lookup-session.model.js` issues short-lived `sessionToken`s for guest tracking, auto-expired by a Mongo TTL index on `expiredAt`.

## Notifications

**In-app only — REAL, but no external channel.**
- `backend/src/utils/notify.js` → `createNotification({ userId, type, title, message, refId, refModel })` writes a `Notification` document; `notifyRole(role, payload)` fans out to every active user with a role via `insertMany`.
- Best-effort: both swallow errors and log `[notify] …` so a notification failure never breaks the business action that triggered it.
- Persisted in `backend/src/models/notification.model.js`; served by `backend/src/routes/notification.routes.js`; consumed client-side by `frontend/src/shared/api/notifications.ts`, which also maps a notification to a role-specific destination route (`notificationTarget`).
- **No web push, no service worker, no WebSocket/SSE, no SMS.** The client learns about new notifications by re-fetching.

**Email notifications (the "send to customer" actions)** layer real SMTP on top of the in-app notification, and only when the customer has an email on file (`hasEmailOnFile`, which is false for walk-in customers):
- `backend/src/services/quotation.service.js:142` — "Your repair quote {code} is ready".
- `backend/src/services/invoice.service.js:347` — "Invoice {id} — {total} ₫".
- `backend/src/services/additional-service.service.js:207` — "Additional service recommended: {name}".

Each returns `hasEmailOnFile` to the caller so the UI can tell the advisor
whether an email was actually attempted.

## Monitoring & Observability

**Error tracking:** None. No Sentry/Rollbar/Bugsnag. Unhandled errors are shaped
by `backend/src/middlewares/error.middleware.js` (`errorHandler`, `notFound`).

**Logs:** `console` only.
- Request logging: `backend/src/middlewares/logger.middleware.js` (`requestLogger`, first middleware in `createApp()`).
- Shared helper: `backend/src/utils/logger.js`.
- Tagged warnings from integrations: `[mailer]`, `[notify]`, `[otp]`, `[db]`.
- No log aggregation, no structured/JSON logging, no correlation ids.

**Audit trail (application-level, in MongoDB):** `backend/src/utils/audit.js` →
`logAudit({ action, actorId, invoiceId, repairOrderId, details })`, stored in
`backend/src/models/audit-log.model.js`, exposed via
`backend/src/routes/audit-log.routes.js`. Used by e.g. `paymentRecorded` in
`backend/src/services/payment.service.js`.

**Metrics/APM:** None.

## CI/CD & Deployment

**Hosting:** Not configured. No Dockerfile, no `docker-compose.yml`, no
`vercel.json` / `netlify.toml` / `render.yaml` / Procfile in the repo.

**CI pipeline:** None. No `.github/workflows/`. `npm test` in `backend/` is run
manually.

**Build artifacts:** `frontend/dist/` is present in the working tree (checked-in
or leftover build output — verify against `frontend/.gitignore` before relying
on it).

## Environment Configuration

**Backend (`backend/.env`, template at `backend/.env.example`):**

Required — boot fails without them (`required()` in `backend/src/config/env.js`):
- `MONGODB_URI`
- `JWT_SECRET`

Optional with defaults:
- `PORT` (4000), `NODE_ENV` (development), `JWT_EXPIRES_IN` (7d), `CORS_ORIGIN` (`http://localhost:5173`; comma-separated list, trimmed).

Optional, feature-gating:
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — blank ⇒ every upload endpoint returns a 500 with an explanatory message.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — blank ⇒ email sends are skipped with one console warning; nothing else breaks.

**Frontend (`frontend/.env`, template at `frontend/.env.example`):**
- `VITE_API_BASE_URL` (default `http://localhost:4000`) — read in `frontend/src/shared/lib/api-client.ts`, trailing slashes stripped. Note this value is **baked into the bundle at build time** and is publicly visible.

**Test env:** `backend/tests/setup.js` sets `NODE_ENV=test`, `MONGODB_URI`,
`JWT_SECRET=test-jwt-secret`, `JWT_EXPIRES_IN=1h`, `CORS_ORIGIN` before any
`src` module loads, then boots an in-memory MongoDB.

**Secrets location:** local `.env` files only (gitignored). No secrets manager,
no CI secret store. `backend/.env` and `frontend/.env` exist on disk; their
contents were not read.

## Webhooks & Callbacks

**Incoming:** None. Every route under `backend/src/routes/` is a
first-party API endpoint; there is no gateway callback, no payment
return/IPN handler, no Cloudinary notification endpoint. (Adding a real
payment provider will require one.)

**Outgoing:** None beyond the Cloudinary upload stream and SMTP sends
described above.

---

*Integration audit: 2026-07-23*
