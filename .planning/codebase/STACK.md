# Technology Stack

**Analysis Date:** 2026-07-23

Monorepo-style layout with two independently installed npm workspaces (no root
`package.json`): `backend/` (Node.js + Express API) and `frontend/` (React +
TypeScript SPA), plus a throwaway scraper project in `clone-2/` used to mirror
the "Kapa" WordPress theme into `frontend/public/`.

## Languages

**Primary:**
- JavaScript (ESM, `"type": "module"`) — entire backend, `backend/src/**`, `backend/scripts/**`, `backend/tests/**`. No TypeScript, no build step.
- TypeScript ~6.0 — entire frontend, `frontend/src/**` (`.ts` / `.tsx`). Config: `frontend/tsconfig.json` (target ES2023, `moduleResolution: "bundler"`, `noEmit`, `verbatimModuleSyntax`, `noUnusedLocals`/`noUnusedParameters` on).

**Secondary:**
- HTML/CSS — `frontend/index.html` plus the cloned WordPress theme assets under `frontend/public/kapa-auth/**` (bootstrap, owl.carousel, nice-select, remixicon, flaticon, WooCommerce stylesheets).
- CSS (Tailwind v4 + custom theme) — `frontend/src/styles.css`, `frontend/src/shared/config/theme.css`.

## Runtime

**Environment:**
- Node.js v22.15.0 (locally installed; no `.nvmrc` / `engines` field pinned — worth adding).
- Browser: modern evergreen (ES2023 target, no legacy polyfills configured).

**Package Manager:**
- npm
- Lockfiles present: `backend/package-lock.json`, `frontend/package-lock.json`, `clone-2/package-lock.json` (lockfileVersion 3). Dependencies must be installed separately in each folder.

## Frameworks

**Backend core:**
- Express 4.22.2 — HTTP layer, wired in `backend/src/app.js` (`createApp()`), listened on in `backend/src/server.js`.
- Mongoose 8.24.0 — ODM over MongoDB; connection in `backend/src/config/db.js`, models in `backend/src/models/*.model.js`.

**Frontend core:**
- React 19.2.7 + React DOM 19.2.7 — entry `frontend/src/main.tsx`.
- React Router DOM 7.17.0 — routing, see `frontend/src/app/**` and `frontend/src/shared/auth/routes.ts`.
- Ant Design 6.4.3 + `@ant-design/icons` 6.2.5 — admin/staff UI components.
- Tailwind CSS 4.3.0 via `@tailwindcss/vite` 4.3.0 — utility styling (Vite plugin, no `tailwind.config.js`; v4 CSS-first config lives in `frontend/src/styles.css`).

**Testing:**
- Vitest 4.1.10 — backend only. Config: `backend/vitest.config.js` (node environment, `globals: false` so `describe`/`it` are imported explicitly, `fileParallelism: false`, setup file `backend/tests/setup.js`).
- Supertest 7.2.2 — HTTP-level integration tests against `createApp()` (`backend/tests/integration/*.routes.test.js`).
- `mongodb-memory-server` 11.2.0 — in-memory MongoDB spun up per test run in `backend/tests/setup.js`; collections wiped in `beforeEach`.
- `@vitest/coverage-v8` 4.1.10 — coverage scoped to `src/services/**`, `src/controllers/**`, `src/routes/**`.
- **Frontend has no test runner or tests.** `playwright` 1.61.1 is a devDependency in `frontend/package.json` but there is no Playwright config, no `*.spec.ts`, and no `test` script — it is effectively unused/vestigial.

**Build/Dev:**
- Vite 8.0.16 — frontend dev server and bundler. Config: `frontend/vite.config.ts` (plugins: `@vitejs/plugin-react` 6.0.2, `@tailwindcss/vite`). Default dev port 5173 (matches backend CORS default).
- nodemon 3.1.14 — backend watch mode. Config: `backend/nodemon.json` (watches `backend/src`, extensions `js,json`, execs `node src/server.js`).
- `tsc` — type-check gate in the frontend build (`build: "tsc && vite build"`); type errors fail the build.

## Key Dependencies

**Backend — critical:**
- `jsonwebtoken` 9.0.3 — access tokens, wrapped in `backend/src/utils/jwt.js` (`signAccessToken`/`verifyAccessToken`, payload `{ sub, role }`).
- `bcryptjs` 3.0.3 — password hashing, wrapped in `backend/src/utils/password.js`.
- `cors` 2.8.6 — origin allowlist from `CORS_ORIGIN`, applied in `backend/src/app.js`.
- `dotenv` 16.6.1 — loaded once in `backend/src/config/env.js`.
- `mongodb` 7.3.0 — direct driver dependency (Mongoose bundles its own; this is listed explicitly).

**Backend — infrastructure / integrations:**
- `nodemailer` 9.0.3 — SMTP email, `backend/src/utils/mailer.js`.
- `cloudinary` 2.10.0 — image hosting, `backend/src/utils/cloudinary.js`.
- `multer` 2.2.0 — multipart upload parsing (memory storage), `backend/src/middlewares/upload.middleware.js`.

**Frontend:**
- `dayjs` 1.11.21 — date formatting / AntD date pickers.
- `jspdf` 4.2.1 + `html2canvas` 1.4.1 — client-side invoice/receipt PDF export, `frontend/src/shared/lib/pdf-export.ts`.
- CSV export is hand-rolled (no library): `frontend/src/shared/lib/csv-export.ts`.
- HTTP is plain `fetch` wrapped in `frontend/src/shared/lib/api-client.ts` — **no axios**, no react-query/SWR; data fetching is manual `useEffect` + local state.

## Database

- MongoDB (Atlas connection string in `backend/.env.example`), accessed only through Mongoose.
- Connection bootstrap: `backend/src/config/db.js` (`connectDb()` awaited before the HTTP server listens; `dbStatus()` feeds `GET /api/health`).
- 22 models in `backend/src/models/` (`user`, `vehicle`, `booking`, `booking-history`, `repair-order`, `inspection-report`, `service`, `service-category`, `service-quote`, `service-request`, `invoice`, `payment`, `part`, `review`, `schedule`, `notification`, `audit-log`, `otp`, `lookup-session`, `transfer-request`, `revenue-report`, plus the `index.js` barrel).
- Models are reached through a thin repository layer in `backend/src/repositories/*.repository.js` (each exposes `.model` plus helpers).
- TTL indexes are used for ephemeral data, e.g. `backend/src/models/lookup-session.model.js` (`expiredAt` with `expireAfterSeconds: 0`).

## Dev Scripts

**Backend (`backend/package.json`):**
```bash
npm run dev            # nodemon src/server.js
npm start              # node src/server.js
npm run seed           # node scripts/seed.js — full demo dataset
npm test               # vitest run
npm run test:watch     # vitest
npm run test:coverage  # vitest run --coverage (v8, text + html)
```

Extra maintenance scripts (run with plain `node`): `backend/scripts/seed-admin.js`,
`backend/scripts/backfill-booking-seats.js`, `backend/scripts/backfill-invoiced-at.js`,
`backend/scripts/test-slot-concurrency.js`.

**Frontend (`frontend/package.json`):**
```bash
npm run dev      # vite (default http://localhost:5173)
npm run build    # tsc && vite build → frontend/dist
npm run preview  # vite preview
```

> No lint/format tooling is configured anywhere: no ESLint, Prettier, or Biome
> config in either package. Style is convention-by-example only.

## Configuration

**Environment (backend):** parsed and validated in `backend/src/config/env.js`.
Required (throws at boot if missing): `MONGODB_URI`, `JWT_SECRET`.
Optional with defaults: `PORT` (4000), `NODE_ENV` (development), `JWT_EXPIRES_IN` (7d),
`CORS_ORIGIN` (`http://localhost:5173`, comma-separated list).
Optional, read but not required: `CLOUDINARY_*`, `SMTP_*` (see `backend/.env.example`).
`backend/.env` exists locally and is gitignored — contents not inspected.

**Environment (frontend):** `frontend/.env.example` declares a single var,
`VITE_API_BASE_URL` (default `http://localhost:4000`), consumed in
`frontend/src/shared/lib/api-client.ts`.

**Domain constants:** booking slot hours and capacity live in
`backend/src/config/constants.js` (`OPEN_HOUR` 8, `LAST_SLOT_HOUR` 16, `SLOT_CAPACITY` 5).

**Roles:** `USER_ROLES` in `backend/src/models/user.model.js` —
`onlineCustomer`, `walkInCustomer`, `serviceAdvisor`, `technician`, `accountant`, `admin`.

## Platform Requirements

**Development:**
- Node.js 22.x, npm.
- A reachable MongoDB (Atlas URI or local `mongod`). Tests do not need one — `mongodb-memory-server` downloads and runs its own binary on first test run (hence `hookTimeout: 60000`).
- Optional: Cloudinary account (photo uploads) and an SMTP account / Gmail App Password (outbound email). Without them the app boots and works; only those specific features degrade.

**Production:**
- No Dockerfile, no CI workflow, no deploy manifest in the repo — deployment target is undecided/manual.
- Backend is a stateless Node process (`node src/server.js`); uploads never touch local disk (Cloudinary), so an ephemeral filesystem is fine.
- Frontend builds to static assets in `frontend/dist` and can be served by any static host; `frontend/public/kapa-auth/**` and `frontend/public/external/**` ship as part of that bundle.

---

*Stack analysis: 2026-07-23*
