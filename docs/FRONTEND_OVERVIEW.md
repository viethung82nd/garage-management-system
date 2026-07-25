# Frontend Overview — UI Stack, Design & Export

Ghi lại tổng quan kỹ thuật frontend: UI stack (antd/Tailwind), kiến trúc thư mục, thiết kế trang chủ & khu vực customer, và cơ chế export PDF/CSV. Tham chiếu tới code bằng đường dẫn tương đối `frontend/...`.

## 1. Kiến trúc thư mục (Feature-Sliced Design)

`frontend/src/` tổ chức theo layer kiểu FSD:

- `app/` — bootstrap: `App.tsx` (toàn bộ route table), `route-guards.tsx` (`RequireAuth`, `RequireRole`)
- `pages/` — 1 trang = 1 route, chia theo role: `admin`, `advisor`, `accountant`, `technician`, `customer`, cộng các trang public (`home-five`, `services`, `contact-us`, `our-brands`, `auth`, `appointment`)
- `widgets/` — khối UI ghép nhiều feature: `backoffice-shell`, `service-advisor-shell`, `technician-shell`, `home-five-estimate`, `appointment-booking`, `notification-center`
- `features/`, `entities/` — hiện gần như rỗng (đặt chỗ theo convention FSD, logic thực tế đa số nằm thẳng trong `pages/*/api`, `pages/*/model`)
- `shared/` — dùng chung toàn app: `ui/` (component kit), `auth/`, `lib/` (api-client, export helpers, kapa-template), `config/theme.css`, `api/`

## 2. Routing & Auth

- `react-router-dom` v7, toàn bộ route khai báo tập trung trong [App.tsx](../frontend/src/app/App.tsx) (không dùng file-based routing, không có nội dung trong `app/router/`).
- Các trang back-office (`admin/*`, `advisor/*`, `accountant/*`, `technician/*`) và các trang customer cần đăng nhập đều **lazy-load** qua `React.lazy` + bọc `<Suspense fallback={<RouteFallback />}>`.
- Bảo vệ route bằng 2 lớp guard ở [route-guards.tsx](../frontend/src/app/route-guards.tsx):
  - `RequireAuth` — chặn nếu chưa đăng nhập (`useAuth().isAuthenticated`), redirect `/my-account`.
  - `RequireRole roles={[...]}` — chặn nếu `user.role` không khớp, redirect về trang mặc định của role đó (`getPostLoginPath`).
- Role hệ thống: `admin`, `accountant`, `serviceAdvisor`, `technician`, `onlineCustomer`.
- Auth state quản lý ở `shared/auth/` (`AuthProvider`, `useAuth`, `storage.ts` cho persist token, `routes.ts` cho post-login redirect map).

## 3. Ant Design (antd v6 + @ant-design/icons)

Chỉ dùng ở **khu vực back-office** (admin/advisor/accountant/technician) — không xuất hiện ở trang chủ hay trang customer (chủ đích, xem mục 5).

**Setup:**
- [main.tsx](../frontend/src/main.tsx) bọc app trong `ConfigProvider` (token `fontFamily: var(--font-body)`) + `App` (antd's `AntApp`, để `message`/`notification`/`Modal.confirm` dùng được context theme qua `NotificationCenter`).
- Mỗi shell (`TechnicianShell`, `ServiceAdvisorShell`, `AdminShell`, `AccountantShell`) tự override `ConfigProvider` với `token.colorPrimary/colorLink/borderRadius` theo palette riêng của role đó (đỏ cho advisor/technician; navy/green/amber cho accountant).

**Component đã dùng** (gom từ toàn bộ `pages/{admin,advisor,accountant,technician}` và `widgets/*-shell`):

| Nhóm | Component |
|---|---|
| Layout/nav | ConfigProvider, App, Menu, Avatar, Badge, Popover, Space, Col, Row, Divider |
| Data display | Table, Card, Tag, Typography, List, Empty, Image, Progress, Steps, Tooltip |
| Form/input | Form, Input, InputNumber, Select, AutoComplete, DatePicker, Checkbox, Switch, Upload, Rate |
| Feedback/overlay | Modal, Popconfirm, Alert, Segmented, Dropdown, Spin |
| Icons | `@ant-design/icons` — PlusOutlined, DeleteOutlined, CheckOutlined, SearchOutlined, UploadOutlined, PrinterOutlined, CarOutlined, UserAddOutlined, FileSearchOutlined, CheckCircleFilled... (rải trong action button, cột bảng) |

## 4. Tailwind CSS (v4, qua @tailwindcss/vite)

- Nạp trong [vite.config.ts](../frontend/vite.config.ts) (`tailwindcss()` plugin) và [styles.css](../frontend/src/styles.css) — chỉ import `tailwindcss/theme.css` + `tailwindcss/utilities` (**không** preflight, project có reset CSS riêng).
- `@source not "../public/kapa-auth"` loại thư mục theme WordPress tĩnh khỏi content-scan của Tailwind, tránh việc Tailwind tự sinh utility trùng tên (vd. `.mt-80`) đè lên CSS gốc của theme.
- **Vai trò chính:** utility layout (`flex`, `grid`, `gap-*`, `p-*`, `text-*`, `rounded-*`...) rải trực tiếp trong JSX của ~33 file back-office, làm lớp bố cục bao quanh component antd — antd lo component, Tailwind lo spacing/layout.
- Ở **customer pages**, Tailwind chỉ xuất hiện lác đác (`mt-4`, `text-sm`, `gap-4`, `flex-wrap`) tại 3 file (`CustomerProfilePage`, `CustomerInvoicesPage`, `CustomerBookingsPage`) — không phải hệ thống layout chính ở đó.

## 5. Kỹ thuật "clone theme Kapa" (shared/lib/kapa-template)

Điểm đặc thù của codebase: các trang public/marketing (home-five, our-brands, contact-us, auth...) không code lại UI từ đầu mà **clone HTML tĩnh của theme WordPress/Elementor "Kapa"** và inject vào React qua `dangerouslySetInnerHTML`, dùng hook `useClonedKapaPage` ([shared/lib/kapa-template](../frontend/src/shared/lib/kapa-template/)):

- `parseTemplatePage.ts` — fetch & parse HTML template gốc
- `rewriteKapaRouteLinks.ts` — sửa link nội bộ của theme trỏ về route React thật
- `pruneKapaNavbar.ts` — xoá navbar/footer gốc để dùng chung component thật (`shared/ui/kapa-chrome`: `KapaTopbar`, `KapaNavbar`, `KapaPageBanner`, `KapaFooter`)
- `useMountKapaNavbarWidgets.tsx` — gắn widget React (auth dropdown, giỏ hàng...) vào slot trong navbar đã clone
- `usePageMeta.ts` — set `document.title` + class trên `<body>` theo từng trang

Nhờ vậy toàn bộ trang public giữ nguyên 100% look-and-feel của theme gốc (Bootstrap grid, AOS scroll-animation, Odometer counter), còn phần tương tác thật (form đặt lịch, đăng nhập, tài khoản khách hàng) là các "React island" được mount đè lên đúng vị trí trong markup đã clone.

## 6. Thiết kế Homepage (home-five)

[HomeFivePage.tsx](../frontend/src/pages/home-five/ui/HomeFivePage.tsx) dùng kỹ thuật ở mục 5 để clone `/kapa-auth/home-five/index.html`. Phần React chỉ can thiệp 3 chỗ:

1. `rewriteKapaRouteLinks` + `pruneKapaNavbar` — dùng chung navbar/footer thật của app.
2. Thay node `.estimate-left-content` bằng 1 slot, `createRoot` mount **EstimateSection** ([widgets/home-five-estimate](../frontend/src/widgets/home-five-estimate/ui/EstimateSection.tsx)) — chỗ duy nhất có logic React thật: form đặt lịch (`AppointmentBookingForm`, dùng `useAuth`), 2 "funfact card" đếm số chạy bằng `useAnimatedCount` (`requestAnimationFrame` + `IntersectionObserver`).
3. Hiệu ứng reveal-on-scroll cho heading qua `OVERLAY_REVEAL_SELECTOR`.

**CSS:** phần lớn đến từ theme Kapa gốc (Bootstrap grid `row/col-lg-6`, AOS, Odometer). Phần CSS project tự viết trong `styles.css` chỉ override khối estimate: `.home-five-estimate-panel` (input/select bo góc 14px, focus glow theo `--color-primary`), `.funfact-card` (kính mờ `backdrop-filter: blur`, số đếm dùng font `--font-display`/Oswald). Không có antd, gần như không có Tailwind utility trong trang này.

## 7. Thiết kế Customer pages

`pages/customer/{bookings, invoices, profile, reviews, tracking}` dùng chung `CustomerPageLayout` (cùng chrome Kapa như homepage: Topbar/Navbar/PageBanner/Footer) nhưng **phần nội dung là React thật**, xây trên design-system riêng tự viết: [shared/ui/kapa-customer](../frontend/src/shared/ui/kapa-customer/) (`CustomerPanel`, `CustomerSectionHeading`, `CustomerInfoCard`, `CustomerMetricCard`, `CustomerFormField/Input/Select`, `CustomerStatusBadge`, `CustomerTimeline`, `CustomerBookingCard`, `CustomerRepairStatusPanel`, `CustomerAccountNav`, `CustomerPrimaryButton`, `CustomerEmptyState`) — **không dùng antd** (chủ đích, giữ look Oswald/Spartan của trang marketing thay vì phong cách back-office).

**Style:** CSS thuần, class kiểu BEM (`customer-panel`, `customer-section-heading`, `customer-metric-card`, `customer-timeline__item`, `customer-modal__*`, `customer-booking-card__*`, `customer-invoice-sheet__*`...), ~1800 dòng trong `styles.css`, ăn theo design token ở [theme.css](../frontend/src/shared/config/theme.css) (`--color-primary: #f51304`, `--font-display: Oswald`, `--font-body: Spartan`, `--radius-card: 24px`, `--shadow-soft`). Responsive dùng `@media` breakpoint thủ công (1199.98 / 991.98 / 767.98px, khớp Bootstrap) chứ không dùng prefix Tailwind (`md:`, `lg:`...).

**Pattern UI đáng chú ý:**
- Panel bo góc 24px, shadow mềm, nền gradient nhạt (`customer-page-main-content`).
- Modal chi tiết (`customer-modal`) có 2 biến thể: `--invoice` (hoá đơn dạng in ấn, masthead/logo/bảng dòng hàng) và `--tracking` (kết quả tra cứu, gallery ảnh + thumbnail).
- Timeline dọc (`customer-timeline`) hiển thị tiến trình sửa xe (complete / current / pending).
- Status badge màu theo trạng thái (completed = xanh lá, ready = xanh dương, in-progress = vàng cam, pending = đỏ nhạt).
- Form tra cứu/đặt lịch bo góc 14px, focus glow đỏ nhạt — đồng nhất với style form ở EstimateSection của homepage.

## 8. Export PDF / CSV ("Excel")

Không dùng thư viện Excel thật (không có `xlsx`/`exceljs`). Có 2 helper dùng chung trong `shared/lib/`:

### 8.1 PDF — `pdf-export.ts` (jsPDF + html2canvas)
[exportNodeToPdf(node, filename)](../frontend/src/shared/lib/pdf-export.ts) — chụp (rasterize) 1 DOM node bằng `html2canvas` (scale 2x, `useCORS`), rồi ghép ảnh đó vào PDF khổ A4 bằng `jsPDF`, tự chia nhiều trang nếu nội dung cao hơn 1 trang A4. Có attribute `data-pdf-export-ignore` để loại các nút bấm (Download/Close) khỏi ảnh export.

Dùng cho các trường hợp "in hoá đơn/báo cáo" — nơi UI trên màn hình đã trông như văn bản in sẵn:
- `pages/customer/invoices/ui/CustomerInvoicesPage.tsx` — khách tải PDF hoá đơn của mình
- `pages/accountant/confirm/ui/InvoiceConfirmPage.tsx` — kế toán in/tải hoá đơn khi xác nhận
- `pages/admin/reports/ui/AdminReportsPage.tsx` — export báo cáo doanh thu dạng PDF (chụp cả tab đang xem)

### 8.2 "Excel" — `csv-export.ts` (CSV thuần, không phải .xlsx thật)
[downloadCsv(filename, headers, rows)](../frontend/src/shared/lib/csv-export.ts) — tự build CSV theo RFC 4180 (escape dấu phẩy/ngoặc kép/xuống dòng), thêm BOM (`﻿`) ở đầu file để Excel mở đúng UTF-8 (không bị lỗi font tiếng Việt/₫), rồi tạo `Blob` + link ẩn để trigger download `.csv`. Không phụ thuộc thư viện ngoài.

Dùng cho các trường hợp "xuất dữ liệu thô" — nơi cần số liệu chính xác thay vì ảnh chụp:
- `pages/admin/reports/ui/AdminReportsPage.tsx` — 3 điểm export CSV theo từng tab báo cáo/khoảng thời gian
- `pages/admin/dashboard/ui/AdminDashboardPage.tsx` — export dữ liệu dashboard

> Lưu ý: file `docs/WDP301_Test_Data.xlsx` trong repo là dữ liệu test tách biệt, không liên quan tới cơ chế export này.

## 9. Notification & theming khác

- `widgets/notification-center` — cầu nối giữa antd `App.useApp()` (message/notification) và logic app, mount 1 lần ở `main.tsx`.
- Mỗi shell back-office set `ConfigProvider` riêng theo palette role (xem mục 3) — nghĩa là **không có 1 theme antd toàn cục duy nhất**, mà theme đổi theo route/role đang active.
- Font toàn app: `--font-body: Spartan` (nội dung), `--font-display: Oswald` (heading/số liệu lớn) — áp dụng nhất quán cả ở back-office lẫn customer/marketing (xem ghi nhớ: không đổi font theo từng section dù có lý do thiết kế, phải hỏi trước).

## 10. Testing tooling (tham khảo nhanh)

- `vitest` + `@testing-library/react` + `jsdom` cho unit/component test (`npm run test` / `test:watch`)
- `playwright` có mặt trong devDependencies (E2E, cấu hình cụ thể chưa khảo sát trong tài liệu này)
- `eslint` (flat config) + `prettier` cho lint/format
