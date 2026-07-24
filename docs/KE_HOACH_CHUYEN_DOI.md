# KẾ HOẠCH CHUYỂN ĐỔI — TỪ HỆ THỐNG HIỆN TẠI SANG CHUẨN NGHIỆP VỤ

> **Tài liệu nguồn:** [NGHIEP_VU_GARA_OTO.md](NGHIEP_VU_GARA_OTO.md) (chuẩn nghiệp vụ) · [SO_SANH_NGHIEP_VU_VS_CODE.md](SO_SANH_NGHIEP_VU_VS_CODE.md) (đối chiếu gap)
> **Mục tiêu:** đưa dự án từ **~38%** đáp ứng nghiệp vụ chuẩn lên mức **đạt chuẩn vận hành thật**, qua 5 phase tuần tự.
> **Cách làm việc:** làm xong mỗi phase → bạn test & báo cáo → tôi cập nhật tracking trong chính file này → làm phase kế tiếp.
> **Bắt đầu:** 24/07/2026 · **Người thực hiện:** Claude + bạn (Aaron15)

---

## 0. QUY ƯỚC & CÁCH TRACKING

### Trạng thái công việc

| Ký hiệu | Nghĩa |
|:-------:|-------|
| `[ ]` | Chưa làm |
| `[~]` | Đang làm |
| `[x]` | Đã xong (code) |
| `[✓]` | Đã xong **và bạn đã test pass** |
| `[!]` | Đang vướng / chờ quyết định |
| `[-]` | Đã bỏ khỏi phạm vi (ghi lý do) |

### Trạng thái phase

| Ký hiệu | Nghĩa |
|:-------:|-------|
| ⚪ | Chưa bắt đầu |
| 🔵 | Đang thực hiện |
| 🟢 | Code xong, chờ bạn test |
| ✅ | Bạn đã test pass, chốt |
| ⏸️ | Tạm dừng |

### Quy ước phạm vi hạng mục

- **[BẮT BUỘC]** — cốt lõi nghiệp vụ, không làm thì phase không đạt.
- **[NÊN]** — tăng chất lượng đáng kể, làm nếu còn thời gian trong phase.
- **[STRETCH]** — khối lớn/tùy chọn (bảo hiểm, mua hàng NCC, HĐĐT tích hợp CQT). **Mặc định gấp lại** cho tới khi bạn xác nhận đồ án cần. Xem [§7 Quyết định phạm vi](#7-các-quyết-định-phạm-vi-cần-bạn-chốt).

---

## 1. BẢNG ĐIỀU KHIỂN TỔNG (DASHBOARD)

| Phase | Tên | Trục nghiệp vụ | Trạng thái | Tiến độ | Ước lượng |
|:-----:|-----|----------------|:----------:|:-------:|:---------:|
| **1** | Nền tảng & Kiểm soát | Cross-cutting, §6/§19/§20 | ✅ | 20/20 | 4–6 buổi |
| **2** | Cổng nghiệp vụ: Báo giá → Duyệt → QC → Bàn giao | §5, §7, §8, §9, §10 (bước 3-6) | 🟢 | 18/18 | 5–7 buổi |
| **3** | Luồng Vật tư: Kho & Phụ tùng (+ Mua hàng) | §9 | 🟢 | 14/14 | 5–7 buổi |
| **4** | Luồng Tiền & KPI: Giá vốn, Giờ công, Công nợ | §14, §15, §16 | 🟢 | 12/12 | 5–7 buổi |
| **5** | CSKH, Bảo hành, Nhắc lịch, Hồ sơ xe | §3, §11, §12, §13 | 🟢 | 13/13 | 4–6 buổi |

> **Tổng ước lượng:** ~22–32 buổi công (không tính STRETCH). Cập nhật ô "Tiến độ" và "Trạng thái" sau mỗi lần làm.

### Nhật ký chuyển đổi (Changelog)

| Ngày | Phase | Việc | Ghi chú |
|------|:-----:|------|---------|
| 24/07/2026 | — | Khởi tạo kế hoạch | Chốt cấu trúc 5 phase |
| 24/07/2026 | — | Chốt phạm vi Q1–Q5 | Bỏ bảo hiểm; thêm mua hàng; HĐĐT mock; thêm hạ tầng chất lượng |
| 24/07/2026 | 1 | Bắt đầu Phase 1 | Agent Sonnet làm bảo mật; Opus làm lõi numbering/transaction/audit |
| 24/07/2026 | 1 | Xong A–F (14 mục lõi + bảo mật) | 248/248 test pass; test infra chuyển sang MongoMemoryReplSet |
| 24/07/2026 | 1 | Xong mục G | ESLint/Prettier/CI/Node pin/FE smoke test; BE 248/248, FE build+test OK |
| 24/07/2026 | 1 | **Phase 1 code hoàn tất (20/20)** | Chờ bạn test & báo cáo trước khi sang Phase 2 |
| 24/07/2026 | 1 | ✅ **Phase 1 NGHIỆM THU** | Người dùng test thành công, chốt Phase 1 |
| 24/07/2026 | 2 | Bắt đầu Phase 2 | Agent Sonnet làm QC gate + state machine/bàn giao; Opus làm báo giá/phê duyệt/change order |
| 24/07/2026 | 2 | **Phase 2 code hoàn tất (18/18)** | BE 275/275 pass (40 file); FE build OK + 2/2 test |
| 24/07/2026 | — | Commit git (chưa push) | 3 commit: docs / implementation phase 1-2 / tooling. Giữ nguyên 3 thay đổi có sẵn không thuộc phạm vi (DATABASE_SCHEMA.md, 2 file kapa-auth) |
| 24/07/2026 | 3 | Bắt đầu Phase 3 | Người dùng chọn sang Phase 3 (Phase 2 chưa test thủ công — vẫn để 🟢) |
| 24/07/2026 | 3 | **Phase 3 code hoàn tất (14/14)** | Luồng vật tư liền mạch + mua hàng/NCC. BE 328/328 (44 file); FE build OK. Chờ bạn test |
| 24/07/2026 | 3 | Commit Phase 3 (chưa push) | `86b5585` |
| 24/07/2026 | 4 | **Phase 4 code hoàn tất (12/12)** | Giờ công + lãi gộp + công nợ/tuổi nợ + KPI + HĐĐT mock + fix race thanh toán. BE 349/349 (46 file); FE build OK + tab "Profit & receivables" |
| 24/07/2026 | 4 | Commit Phase 4 (chưa push) | `0937363` + `.gitignore` thêm node_modules/ |
| 24/07/2026 | 5 | **Phase 5 code hoàn tất (13/13) — HẾT KẾ HOẠCH** | Hồ sơ xe/VIN/odometer + bảo hành/comeback + nhắc lịch + follow-up/CSAT/NPS + fix tracking. BE 371/371 (49 file) |
| | | | |

---

## 2. NGUYÊN TẮC XUYÊN SUỐT

Áp dụng cho **mọi** phase, kiểm tra ở cuối mỗi phase:

1. **Không phá vỡ kiến trúc phân lớp** `routes → controllers → services → repositories → models`. Việc mới phải theo đúng khuôn (đây là điểm mạnh nhất của dự án, xem G15).
2. **Giữ tương thích ngược dữ liệu.** Mỗi thay đổi schema phải kèm **script migration** trong `backend/scripts/` cho dữ liệu đã có. Field mới nên có default để bản ghi cũ không vỡ.
3. **Không xóa cứng.** Chuyển sang soft-delete/vô hiệu hóa (BR-CUS-04).
4. **Ghi audit cho mọi thao tác nhạy cảm** ngay khi đụng tới nó (không để dồn về sau).
5. **Viết test backend trước khi báo "xong".** Repo đã có hạ tầng Vitest + mongodb-memory-server rất tốt (235 test) — mọi service mới phải có test đi kèm, đặc biệt các nhánh lỗi.
6. **Mỗi hạng mục [BẮT BUỘC] phải có tiêu chí nghiệm thu (acceptance)** để bạn test — liệt kê ở cuối mỗi phase.
7. **Commit theo hạng mục**, message rõ ràng, không gộp nhiều việc.

---

## 3. PHASE 1 — NỀN TẢNG & KIỂM SOÁT ⚪

> **Vì sao làm trước:** đây là các ràng buộc mà **mọi phase sau đều dựa vào**. Sửa chúng sớm thì rẻ; để muộn (khi đã có dữ liệu thật) thì đắt. Phase này ít "nhìn thấy" trên UI nhưng là nền của toàn hệ thống — tương ứng [§19 Kiểm soát nội bộ](NGHIEP_VU_GARA_OTO.md) và [§20 Pháp lý](NGHIEP_VU_GARA_OTO.md).

**Mục tiêu:** hệ thống tự bảo vệ ở tầng dữ liệu thay vì tin vào UI; mọi chứng từ có số hiệu; mọi thao tác nhạy cảm để lại dấu vết; các lỗ hổng bảo mật rõ ràng được vá.

### Công việc

**A. Toàn vẹn dữ liệu (transactions)**
- [✓] **[BẮT BUỘC]** Bọc `confirmQuotation` trong transaction (set status + ghi `order.services` phải cùng thành công/thất bại) — sửa H.1. 📍 `quotation.service.js`
- [✓] **[BẮT BUỘC]** Bọc `updateAdditionalServiceProposal` (approve + push line lên RO) trong transaction. 📍 `additional-service.service.js`
- [✓] **[BẮT BUỘC]** Bọc `createReception` (tạo User/Vehicle/RO + gắn `booking.repairOrderId`) trong transaction. 📍 `reception.service.js` (resolveCustomer/resolveVehicle giờ session-aware)

**B. Số hiệu chứng từ (R2)**
- [✓] **[BẮT BUỘC]** Thêm collection `Counter` sinh số atomic (`utils/sequence.js`); thêm `code` cho `RepairOrder` (`RO-YYYYMM-#####`) và `Invoice` (`INV-YYYYMM-#####`), unique+sparse index.
- [✓] **[NÊN]** Backfill mã cho RO/Invoice đã có → `scripts/backfill-document-codes.js`.

**C. Vai trò & phân quyền (R10, W10)**
- [✓] **[BẮT BUỘC]** Mở rộng `USER_ROLES`: thêm `qcInspector` + `partsStaff` (cũng thêm vào `LOGIN_ROLES`/`STAFF_ROLES`). 📍 `user.model.js`, `auth.service.js`
- [✓] **[BẮT BUỘC]** Cập nhật `requireRole`: QC route → `qcInspector`; parts route → `partsStaff` (đọc mở cho SA để chuẩn bị Phase 3).

**D. Audit & lịch sử trạng thái (R9, H.12)**
- [✓] **[BẮT BUỘC]** Mở rộng `AUDIT_ACTIONS` (13 action) + thêm `targetModel`/`targetId` generic + index. 📍 `audit-log.model.js`, `utils/audit.js`
- [✓] **[BẮT BUỘC]** Thêm `RepairOrderStatusHistory` + helper `recordStatusChange`; ghi ở create/reception/progress/QC-fail. 📍 model mới + `utils/orderStatus.js`
- [✓] **[NÊN]** `logAudit`/`recordStatusChange` best-effort có log cảnh báo rõ.

**E. Bảo mật (H.2, H.3, H.4, H.5) — agent Sonnet**
- [✓] **[BẮT BUỘC]** `simulate` không còn lấy từ `req.body`; chỉ qua env `PAYMENT_SIMULATE` khi `NODE_ENV!==production`. 📍 `payment.controller.js`, `payment.service.js`
- [✓] **[BẮT BUỘC]** `deliverOtp` gửi email thật qua `mailer.js`; ngừng in OTP ra log. 📍 `otp.js`
- [✓] **[BẮT BUỘC]** `requireAuth` async, đọc `isActive` + refresh role từ DB. 📍 `auth.middleware.js`
- [✓] **[NÊN]** `helmet` + rate limit (chung 300/15p; chặt 20/15p cho `/api/auth`, `/api/bookings`; skip ở test). 📍 `app.js`

**F. Soft-delete (H.7)**
- [✓] **[NÊN]** `deleteService` chuyển sang `isActive=false`. 📍 `service.service.js` (+ test cập nhật)

**G. Hạ tầng chất lượng (Q5) — agent Sonnet**
- [✓] **[NÊN]** ESLint 10 (flat config) + Prettier cho cả `backend/` và `frontend/`; script `lint`/`format`. Lint exit 0 (chỉ warning), **không** reformat ồ ạt.
- [✓] **[NÊN]** Vitest cho frontend + smoke test (`src/shared/__tests__/smoke.test.ts`) → 2/2 pass; `npm run build` FE OK.
- [✓] **[NÊN]** GitHub Actions CI (`.github/workflows/ci.yml`): job backend test + job frontend build/test; lint non-blocking.
- [✓] **[NÊN]** Sửa bom hẹn giờ: literal ngày 2027 → helper `futureDateStr()` (booking + reception test).
- [✓] **[NÊN]** Pin Node: `engines.node >=20` + `.nvmrc`.

### Thay đổi schema
`User` (+2 role) · `RepairOrder` (+`code`) · `Invoice` (+`code`) · **model mới:** `Counter`, `RepairOrderStatusHistory` · `AuditLog` (mở rộng enum).

### ✅ Tiêu chí nghiệm thu Phase 1 (bạn test)
1. Tạo một lệnh sửa chữa mới → có mã dạng `RO-202607-00001`; xuất hóa đơn → có mã `INV-...`.
2. Ngắt kết nối DB giữa lúc confirm báo giá (hoặc mô phỏng lỗi) → **không** còn tình trạng báo giá "approved" mà RO rỗng hạng mục.
3. Vô hiệu hóa một tài khoản → tài khoản đó **không gọi được API nữa** (không phải chờ 7 ngày).
4. Đổi vai trò / phê duyệt báo giá / đổi trạng thái RO → thấy bản ghi trong audit log.
5. Gọi API record payment với `simulate:"succeeded"` trong body → **bị bỏ qua**, không ép được kết quả.
6. Yêu cầu OTP quên mật khẩu → **nhận được email thật**, log không lộ mã.
7. Toàn bộ test backend cũ vẫn pass + test mới cho transaction/numbering pass.

---

## 4. PHASE 2 — CỔNG NGHIỆP VỤ: BÁO GIÁ → DUYỆT → QC → BÀN GIAO ⚪

> **Vì sao làm thứ 2:** đây là **trái tim pháp lý** của hệ thống ([§7](NGHIEP_VU_GARA_OTO.md) báo giá/phê duyệt theo chuẩn California BAR, [§9](NGHIEP_VU_GARA_OTO.md) QC gate). Ba lỗi 🔴 nặng nhất về quy trình (W2, W3, R5) nằm ở đây. Phụ thuộc số hiệu chứng từ + audit + status history của Phase 1.

**Mục tiêu:** biến các "cổng hình thức" thành ràng buộc thật — báo giá có phiên bản & dấu vết duyệt, khách (không phải SA) duyệt phát sinh, QC là cổng chặn hóa đơn, và có bước bàn giao xe.

### Công việc

**A. Báo giá có versioning + dấu vết phê duyệt (R5)**
- [x] **[BẮT BUỘC]** `QuoteVersion` — snapshot bất biến, archive **trước** mỗi lần sửa; `quote.version` tăng dần. 📍 model mới + `quotation.service.js`
- [x] **[BẮT BUỘC]** `approval` record (`approval.schema.js`): `decidedBy`/`decidedByName`, `decidedAt`, `channel`, `contactValue`, `recordedBy`, `approvedTotal` — phân biệt tự-phục-vụ vs nhân-viên-ghi-hộ.
- [x] **[NÊN]** `validUntil` được cưỡng chế — báo giá hết hạn không cho quyết định (409).
- [x] **[NÊN]** `GET /api/quotations/:id/versions` xem lịch sử.

**B. Duyệt một phần + Deferred Work (R6, W9-phần deferred)**
- [x] **[BẮT BUỘC]** `confirmQuotation` nhận `lineDecisions[]` → duyệt/từ chối **theo từng dòng**; trạng thái mới `partiallyApproved`.
- [x] **[BẮT BUỘC]** `DeferredWork` gắn với **xe** (nguồn quote/RO/inspection, `estimatedPrice`, `remindAt` +30 ngày).
- [x] **[NÊN]** Ghi `declineReason` mỗi dòng bị loại; dòng không ai quyết định → coi là từ chối (không âm thầm tính tiền).
- [x] **[NÊN]** `GET /api/deferred-work` (+ `totalEstimatedValue`), `PATCH /api/deferred-work/:id` (converted/dismissed).

**C. Change Order đúng chủ thể — khách duyệt (W3)**
- [x] **[BẮT BUỘC]** `PATCH /api/quotations/:id/customer-decision` + `PATCH /api/additional-service-proposals/:id/customer-decision` cho `onlineCustomer`; kích hoạt `approvedByCustomer`/`rejectedByCustomer`.
- [x] **[BẮT BUỘC]** Chỉ push line lên RO **sau khi có phê duyệt hợp lệ**; kiểm tra quyền sở hữu (trả 404 để không lộ dữ liệu khách khác).
- [x] **[BẮT BUỘC]** Ghi `revisedOrderTotal` — change order nêu **tổng mới**, không chỉ phần chênh.
- [x] **[NÊN]** SA duyệt hộ khách vãng lai **bắt buộc** `approval.channel` + `decidedByName` (thiếu → 400, không đẩy line). FE có dialog ghi nhận (AntD, kế thừa theme).

**D. QC là cổng chặn thật (W2)**
- [x] **[BẮT BUỘC]** `qcPassedAt` + `qcBy`; QC pass → status `readyForDelivery`; QC fail **xóa** `qcPassedAt`/`qcBy` (chống kế thừa pass cũ).
- [x] **[BẮT BUỘC]** `generateInvoiceFromRepairOrder` + `forwardToAccountant` gate theo `qcPassedAt` thay vì `status==="completed"`.
- [x] **[BẮT BUỘC]** Chặn `reviewerId === order.technicianId` → **403** (tách trách nhiệm, BR-QC-01).

**E. State machine RO + Bàn giao (R1, W5)**
- [x] **[BẮT BUỘC]** Thêm `waitingParts`, `waitingCustomer`, `onHold`, `readyForDelivery`, `delivered`, `closed` + hằng `WAITING_STATUSES`/`TERMINAL_ORDER_STATUSES`.
- [x] **[BẮT BUỘC]** Vào trạng thái chờ **bắt buộc có lý do** (400 nếu thiếu) → ghi vào status history.
- [x] **[BẮT BUỘC]** `POST /:id/deliver`: chặn nếu chưa QC, chưa có hóa đơn, hoặc hóa đơn chưa `paid` (BR-INV-04); set `deliveredAt`/`deliveredBy`.
- [x] **[BẮT BUỘC]** Guard suy diễn trạng thái theo dòng — không kéo `readyForDelivery`/`delivered` ngược về `inProgress`.

### Thay đổi schema
`ServiceQuote` (+approval, +per-line status) · **model mới:** `QuoteVersion`, `DeferredWork` · `RepairOrder` (+`qcPassedAt`, `qcBy`, +status mới) · `ServiceRequest` (kích hoạt trạng thái customer).

### ✅ Tiêu chí nghiệm thu Phase 2 (bạn test)
1. Sửa một báo giá đã gửi → tạo version mới, bản cũ vẫn xem lại được nguyên trạng.
2. Duyệt báo giá → thấy ghi rõ ai duyệt, lúc nào, qua kênh nào.
3. Duyệt một phần (bỏ 1 hạng mục) → hạng mục bị bỏ xuất hiện trong Deferred Work của xe.
4. KTV đề xuất phát sinh → **khách** (tài khoản onlineCustomer) mới là người bấm duyệt; SA không tự cộng tiền được; và báo giá bổ sung hiển thị tổng mới.
5. Cố xuất hóa đơn cho một đơn KTV vừa "completed" **nhưng chưa QC** → **bị chặn**.
6. Người QC trùng với người làm → **bị chặn**.
7. Đơn chưa thanh toán → **không bàn giao được**; sau khi thu tiền + bàn giao → trạng thái `delivered`.

---

## 5. PHASE 3 — LUỒNG VẬT TƯ: KHO & PHỤ TÙNG 🟢

> **Vì sao làm thứ 3:** đây là **luồng đang đứt hoàn toàn** (W1 — lỗi nặng nhất), tương ứng [§9](NGHIEP_VU_GARA_OTO.md). Cần Phase 1 (vai trò `partsStaff`, audit `stockAdjusted`) và Phase 2 (báo giá đã versioning) làm nền.

**Mục tiêu:** phụ tùng trở thành thực thể được quản lý tồn kho thật — mỗi lần bán trừ kho, có giữ chỗ, có phiếu xuất, và trạng thái `waitingParts` phản ánh thiếu hàng thật.

### Công việc

**A. Liên kết phụ tùng vào chứng từ (W1 gốc)**
- [x] **[BẮT BUỘC]** `partId` (ref `Part`) vào dòng báo giá/RO/hóa đơn `kind:"part"`; SA chọn từ danh mục. Hóa đơn thêm `partCondition` (mới/tái chế/…).
- [x] **[BẮT BUỘC]** Mở quyền đọc danh mục phụ tùng cho `serviceAdvisor` (đã làm ở Phase 1).

**B. Chuyển động tồn kho (W1 lõi)**
- [x] **[BẮT BUỘC]** `InventoryTransaction` (receipt/issue/return/adjustment/writeOff, ref part+RO+PO, giá vốn đóng băng, `balanceAfter`). `utils/stock.js` là cổng duy nhất.
- [x] **[BẮT BUỘC]** `POST /:id/issue-parts` trừ `stockQuantity` + ghi sổ; auto-consume ở bàn giao (lưới an toàn, idempotent); giao dịch atomic.
- [x] **[BẮT BUỘC]** `StockReservation` — duyệt báo giá thì giữ chỗ; `available = onHand − reserved`; không quote đè phần đã giữ. Xóa RO → trả hàng.
- [x] **[BẮT BUỘC]** Thiếu tồn → RO tự chuyển `waitingParts` kèm lý do (nối status Phase 2) + ghi `shortfall` để mua bù.

**C. Giá vốn (chuẩn bị cho Phase 4)**
- [x] **[BẮT BUỘC]** `costPrice` (bình quân gia quyền) trên `Part`; đóng băng vào dòng ledger lúc xuất (BR-PRT-03).
- [x] **[NÊN]** Min/Max + `reorderPoint`; lọc `?lowStock=true` + gợi ý đặt hàng.

**D. Kiểm kê & điều chỉnh**
- [x] **[NÊN]** `POST /:id/adjust` bắt buộc lý do + ghi audit `stockAdjusted` + ledger; `stockQuantity` **không** sửa qua PUT nữa; sổ `/:id/transactions`.

**E. Mua hàng (Q2 — ĐÃ CHỐT LÀM) — agent Sonnet**
- [x] **[BẮT BUỘC]** `Supplier` (soft-delete) + `PurchaseOrder` (draft→sent→partiallyReceived→received; cancel chỉ khi chưa nhận gì); **nhận hàng từng phần** qua nhiều đợt, cập nhật kho + bình quân giá vốn.
- [x] **[BẮT BUỘC]** Công nợ phải trả (AP) theo NCC + tuổi nợ (current/0-30/31-60/61-90/90+); `recordSupplierPayment` chặn trả vượt; PO line có `repairOrderId`/backorder liên kết ngược.
- [x] **[NÊN]** `getReorderSuggestions` (part ≤ reorderPoint → SL đề xuất + NCC ưu tiên).

### Thay đổi schema
`Part` (+`costPrice`, +`reservedQuantity`, +Min/Max/`reorderPoint`, +`condition`, +`isActive`, +virtual `availableQuantity`) · dòng part trên Quote/RO/Invoice (+`partId`, +`partCondition`) · **model mới:** `InventoryTransaction`, `StockReservation`, `Supplier`, `PurchaseOrder`.

### ✅ Tiêu chí nghiệm thu Phase 3 (bạn test)
1. Báo giá một phụ tùng → chọn từ danh mục (không gõ tay); duyệt → tồn khả dụng của phụ tùng đó **giảm phần giữ chỗ**.
2. Hoàn tất/bàn giao RO có phụ tùng → `stockQuantity` **giảm đúng số lượng**; có phiếu xuất trong `InventoryTransaction`.
3. Cố báo giá số lượng vượt tồn → **bị chặn** hoặc RO chuyển `waitingParts`.
4. Xem dòng RO cũ sau khi giá vốn danh mục đổi → giá vốn trên dòng **không đổi** (đã đóng băng).
5. Admin/partsStaff điều chỉnh kho → có bản ghi audit `stockAdjusted`.

---

## 6. PHASE 4 — LUỒNG TIỀN & KPI: GIÁ VỐN, GIỜ CÔNG, CÔNG NỢ 🟢

> **Vì sao làm thứ 4:** trả lời câu hỏi quan trọng nhất của chủ gara — *"xe này lãi bao nhiêu?"* ([§14](NGHIEP_VU_GARA_OTO.md), [§16](NGHIEP_VU_GARA_OTO.md)). Cần Phase 3 (giá vốn phụ tùng) mới tính được lãi gộp.

**Mục tiêu:** đo được lãi gộp tách nhân công/phụ tùng, đo được năng suất thợ, quản được công nợ, và có bộ KPI ngành.

### Công việc

**A. Giờ công (R4) — agent Sonnet**
- [x] **[BẮT BUỘC]** `TimeLog` + `POST /:id/clock-on` `/clock-off` `GET /:id/time-logs`; một KTV chỉ 1 span mở tại một thời điểm.
- [x] **[BẮT BUỘC]** Clock-on **bị chặn** khi RO ở trạng thái chờ → thời gian chờ không bao giờ vào giờ công (BR-JOB-03).
- [-] **[NÊN]** 3C — đã có `stepNotes` + ảnh từ Phase 1; nâng cấu trúc hóa để Phase 5 (không chặn Phase 4).

**B. Giá vốn → Lãi gộp (R10)**
- [x] **[BẮT BUỘC]** `hourlyCost` cho KTV; lãi gộp nhân công = doanh thu NC − (phút log × đơn giá giờ). 📍 `user.model.js`, `reporting.service.js`
- [x] **[BẮT BUỘC]** `GET /admin/reports/gross-profit` — tách **nhân công / phụ tùng** (COGS lấy từ ledger `issue` đã đóng băng giá vốn). 📍 `reporting.service.js`

**C. Công nợ (R11)**
- [x] **[BẮT BUỘC]** `GET /admin/reports/receivables` — công nợ theo khách + tuổi nợ (current/1-30/31-60/61-90/90+).
- [x] **[NÊN]** `creditLimit` trên `User`; chặn xuất hóa đơn khi khách bán chịu đã chạm hạn (BR-ACC-03); limit=0 = khách tiền mặt, không áp dụng.

**D. KPI ngành (§16.1)**
- [x] **[BẮT BUỘC]** `GET /admin/reports/kpis`: **ELR, ARO, giờ bán, Carry-over rate, Rework rate**. *(Comeback rate thật cần `parentRoId` — để Phase 5; hiện dùng rework rate.)*
- [-] **[NÊN]** Tần suất theo dõi — báo cáo nhận range ngày tùy chọn (tuần/tháng do người dùng chọn).

**E. Thanh toán & Hóa đơn hợp lệ (H.6, W4-phần cơ bản)**
- [x] **[BẮT BUỘC]** Race `amountPaid` → 1 op atomic (`findOneAndUpdate` + `$inc` qua pipeline) + guard chống trả vượt dưới đồng thời. 📍 `payment.service.js`
- [x] **[BẮT BUỘC]** `User` +`taxCode`/`billingName`/`billingAddress`; hóa đơn snapshot `billing` (tên/MST/địa chỉ + biển số/VIN/odometer); dòng phụ tùng có `partCondition`.
- [x] **[NÊN]** HĐĐT **demo/mock**: `POST /invoices/:id/einvoice` sinh ký hiệu + số + mã tra cứu; chặn phát hành 2 lần; **không** gọi CQT thật.

### Thay đổi schema
**model mới:** `TimeLog` · `User` (+`taxCode`, +`billingName`, +`billingAddress`, +`creditLimit`, +`hourlyCost`) · `Invoice` (+`billing` snapshot, +`einvoice`, +`partId`/`partCondition` trên dòng) · **service mới:** `reporting.service.js`.

### ✅ Tiêu chí nghiệm thu Phase 4 (bạn test)
1. KTV clock-on rồi clock-off một hạng mục → hệ thống ghi giờ công; thời gian chờ phụ tùng không bị tính vào.
2. Báo cáo hiển thị **lãi gộp** tách riêng nhân công và phụ tùng, không chỉ doanh thu.
3. Báo cáo công nợ hiển thị tuổi nợ theo khách.
4. Dashboard hiển thị ELR, ARO, năng suất/hiệu suất KTV, comeback rate.
5. Hai thanh toán đồng thời cho một hóa đơn → tổng `amountPaid` **đúng**, không mất khoản nào.
6. Hóa đơn cho khách doanh nghiệp → có MST, thông tin xe + odometer.

---

## 7. PHASE 5 — CSKH, BẢO HÀNH, NHẮC LỊCH, HỒ SƠ XE 🟢

> **Vì sao làm cuối:** hoàn thiện bước 7 quy trình ([§12](NGHIEP_VU_GARA_OTO.md)), bảo hành/comeback ([§11](NGHIEP_VU_GARA_OTO.md)), và củng cố hồ sơ khách/xe ([§3](NGHIEP_VU_GARA_OTO.md)). Cần dữ liệu từ các phase trước (RO đã đóng, DVI, deferred work).

**Mục tiêu:** giữ chân khách — có bảo hành & nhận diện comeback, có follow-up & nhắc lịch, và hồ sơ xe đủ để nhắc việc.

### Công việc

**A. Hồ sơ xe & khách (R7, R8, A1, A2)**
- [x] **[BẮT BUỘC]** `OdometerLog` lịch sử theo thời gian; nhập lùi → **cảnh báo + `isRollback` + audit** (không chặn cứng để không kẹt quầy). `GET /vehicles/:id/odometer`.
- [x] **[BẮT BUỘC]** VIN (`chassisNumber`) unique+sparse ở tầng schema; `Vehicle` +`registrationExpiry`/`insuranceExpiry`/`manufacturerWarrantyExpiry`/`soldAt`; `PATCH /vehicles/:id/profile`.
- [-] **[BỎ/NÊN]** `VehicleOwnership` nhiều-nhiều — bỏ khỏi phạm vi đồ án (giữ lịch sử đơn giản; VIN unique đã xử lý trùng xe).

**B. Bảo hành & Comeback (W6)**
- [x] **[BẮT BUỘC]** Bảo hành mặc định (3 tháng / 5.000 km, hằng số cấu hình) **đóng dấu lúc bàn giao** → `warrantyUntilDate`/`warrantyUntilKm`.
- [x] **[BẮT BUỘC]** `RepairOrder` +`parentRoId` +`isComeback`; tiếp nhận **tự nhận diện** xe quay lại còn hạn bảo hành (theo ngày + km) → trả cảnh báo; truyền `parentRoId` để mở RO comeback liên kết.
- [-] **[NÊN]** Phân định trách nhiệm comeback theo `jobType` — `jobType` (R3) chưa làm ở các phase trước; comeback hiện xử lý qua giá (SA đặt 0đ cho lỗi gara). Ghi nhận là hạng mục mở.

**C. Follow-up & Khảo sát (§12.1, §12.2) — agent Sonnet**
- [x] **[BẮT BUỘC]** `FollowUp` sinh **72h sau bàn giao** (`POST /follow-ups/generate` back-fill); sổ theo dõi.
- [x] **[NÊN]** Ghi nhận CSAT (1-5) / NPS (0-10) / phân loại khiếu nại (7 nhóm); `GET /follow-ups/satisfaction` tổng hợp.

**D. Nhắc lịch (W9) — agent Sonnet**
- [x] **[BẮT BUỘC]** `Reminder` engine (`POST /reminders/generate`): nhắc bảo dưỡng định kỳ, **Deferred Work** (Phase 2), hạn đăng kiểm/bảo hiểm/bảo hành. Idempotent (không trùng).
- [x] **[NÊN]** Kênh: in-app notification khi đánh dấu `sent` (SMS/Zalo để mở rộng sau).

**E. Sửa lỗi truyền thông khách (H.8)**
- [x] **[BẮT BUỘC]** `tracking.service.js` thêm case cho `reworkRequired`/`waitingParts`/`waitingCustomer`/`onHold`/`readyForDelivery`/`delivered`/`closed` — không còn rơi vào "Awaiting service intake".

**F. Bảo hiểm (Q1 — ĐÃ CHỐT KHÔNG LÀM)**
- [-] **[BỎ]** Nghiệp vụ bảo hiểm ba bên — bỏ khỏi phạm vi theo quyết định Q1. Giữ nguyên `Invoice.repairOrderId` unique.

**Kèm theo:** Comeback rate KPI (hoãn từ Phase 4) đã bổ sung vào `reporting.service.js#getWorkshopKpis` nhờ `isComeback`.

### Thay đổi schema
**model mới:** `OdometerLog`, `Reminder`, `FollowUp` · `Vehicle` (VIN unique, +4 trường ngày) · `RepairOrder` (+`parentRoId`, +`isComeback`, +`warrantyUntilDate`, +`warrantyUntilKm`).

### ✅ Tiêu chí nghiệm thu Phase 5 (bạn test)
1. Nhập odometer nhỏ hơn lần trước → **cảnh báo**, có ghi log.
2. Xe từng sửa quay lại trong hạn bảo hành → tiếp nhận **tự cảnh báo**; tạo RO comeback liên kết RO gốc.
3. Sau bàn giao 1 xe → hệ thống sinh nhiệm vụ follow-up.
4. Xe tới hạn bảo dưỡng / có Deferred Work → xuất hiện trong danh sách nhắc lịch.
5. Khách tra cứu xe đang rework → **không** còn thấy "Awaiting service intake".

---

## 8. CÁC QUYẾT ĐỊNH PHẠM VI — ĐÃ CHỐT (24/07/2026)

| # | Quyết định | **Kết luận** | Áp dụng vào kế hoạch |
|---|-----------|--------------|----------------------|
| Q1 | Nghiệp vụ **bảo hiểm** | ❌ **KHÔNG làm** | Phase 5 mục F đánh dấu `[-]` bỏ khỏi phạm vi; **giữ** `Invoice.repairOrderId` unique |
| Q2 | **Mua hàng / NCC / công nợ phải trả** | ✅ **CÓ làm** | Phase 3 mục E nâng từ [STRETCH] → **[BẮT BUỘC]** |
| Q3 | **Hóa đơn điện tử** (NĐ 70/2025) | ✅ **CÓ, dạng demo/mock** | Phase 4 mục E: sinh HĐĐT giả lập (số + mã tra cứu + XML/PDF mock), **không** gọi API CQT thật |
| Q4 | Mục tiêu | 🎯 **Đủ điểm đồ án, nhưng trình hội đồng phải "như vận hành thật"** | Làm hết **[BẮT BUỘC]** + các **[NÊN]** giúp demo thuyết phục; ưu tiên tính chỉnh chu khi trình bày |
| Q5 | Hạ tầng chất lượng (**ESLint/Prettier, test FE, CI**) | ✅ **CÓ làm** | Thêm mục G vào Phase 1, giao agent Sonnet làm song song |

> **Ghi chú vận hành:** dữ liệu MongoDB hiện tại là **dữ liệu test**, không phải data thật → được phép đổi schema/migration thoải mái (bạn đã confirm rủi ro nhẹ). `.env` đã trỏ tới **replica set** nên transaction chạy được ở dev; chỉ cần đổi test setup sang `MongoMemoryReplSet`.
>
> **Tối ưu token:** các task cơ học/độc lập (bảo mật, hạ tầng chất lượng) giao **agent Sonnet/Haiku** chạy nền; phần lõi đụng nhiều service chung do Claude (Opus) tự làm để tránh xung đột file. FE giữ nguyên **font + màu hiện tại**, chỉ sửa khi bắt buộc và dùng skill UI.

---

## 9. RỦI RO & LƯU Ý KHI CHUYỂN ĐỔI

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Đổi schema làm vỡ dữ liệu cũ | Mỗi thay đổi kèm script migration trong `backend/scripts/`; field mới có default |
| Đổi enum status làm vỡ frontend | Cập nhật đồng bộ FE + map tracking; giữ giá trị cũ tương thích |
| Transaction cần MongoDB replica set | Kiểm tra môi trường; nếu standalone thì bật replica set 1 node cho dev |
| Test booking hardcode ngày 2027 (bom hẹn giờ) | Sửa sang ngày động trong Phase 1 khi đụng test |
| Frontend 2 phương ngữ style + FSD rỗng | Không refactor ồ ạt; theo style của vùng đang sửa; cân nhắc Q5 |
| Theme Kapa chèn JS phá React | Giữ MutationObserver niceSelect; mở rộng cho mọi panel khi đụng tới |

---

## 10. LIÊN KẾT NHANH

- Chuẩn nghiệp vụ: [NGHIEP_VU_GARA_OTO.md](NGHIEP_VU_GARA_OTO.md)
- Đối chiếu gap có `file:line`: [SO_SANH_NGHIEP_VU_VS_CODE.md](SO_SANH_NGHIEP_VU_VS_CODE.md)
- Bản đồ codebase kỹ thuật: `.planning/codebase/` (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS)

---

*Kế hoạch phiên bản 1.0 — 24/07/2026. Cập nhật trạng thái/tiến độ trực tiếp trong file này sau mỗi phase.*
