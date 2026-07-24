# NGHIỆP VỤ QUẢN LÝ GARA Ô TÔ — TÀI LIỆU THAM CHIẾU CHUẨN

> **Mục đích:** Tài liệu này mô tả **toàn bộ quy trình nghiệp vụ chuẩn** của một gara / xưởng dịch vụ ô tô, tổng hợp từ các nguồn có độ tin cậy cao (tài liệu đào tạo hãng, cơ quan quản lý nhà nước, tiêu chuẩn quốc gia, và các nhà cung cấp phần mềm DMS/SMS hàng đầu).
> Tài liệu được dùng làm **baseline (chuẩn đối chiếu)** để so sánh với hệ thống đang phát triển.
>
> **Phiên bản:** 1.0 — 23/07/2026
> **Phạm vi:** Gara độc lập / xưởng dịch vụ ủy quyền (3S/4S) quy mô vừa tại Việt Nam, có làm cả dịch vụ bảo dưỡng — sửa chữa chung (GJ), sửa chữa thân vỏ — sơn (BP) và dịch vụ bảo hiểm.

---

## MỤC LỤC

| # | Phần | Nội dung |
|---|------|----------|
| 0 | [Nguồn tham chiếu](#0-nguồn-tham-chiếu-và-mức-độ-tin-cậy) | Danh sách nguồn & mức tin cậy |
| 1 | [Tổng quan mô hình](#1-tổng-quan-mô-hình-vận-hành-gara) | Bối cảnh, vai trò, dòng giá trị |
| 2 | [Khung quy trình 7 bước](#2-khung-quy-trình-cốt-lõi-7-bước) | Xương sống toàn hệ thống |
| 3 | [Nghiệp vụ 01 — Khách hàng & Xe](#3-nghiệp-vụ-01--quản-lý-khách-hàng-và-hồ-sơ-xe) | CRM, hồ sơ xe |
| 4 | [Nghiệp vụ 02 — Đặt lịch & Hoạch định](#4-nghiệp-vụ-02--đặt-lịch-hẹn-và-hoạch-định-năng-lực) | Booking, capacity |
| 5 | [Nghiệp vụ 03 — Tiếp nhận xe](#5-nghiệp-vụ-03--tiếp-nhận-xe-reception--check-in) | Reception, walk-around |
| 6 | [Nghiệp vụ 04 — Kiểm tra & Chẩn đoán](#6-nghiệp-vụ-04--kiểm-tra-và-chẩn-đoán-inspection--dvi) | DVI/MPI |
| 7 | [Nghiệp vụ 05 — Báo giá & Phê duyệt](#7-nghiệp-vụ-05--báo-giá-và-phê-duyệt-estimate--authorization) | Quote, approval, change order |
| 8 | [Nghiệp vụ 06 — Lệnh sửa chữa](#8-nghiệp-vụ-06--lệnh-sửa-chữa-repair-order--ro) | RO, dispatch, clock |
| 9 | [Nghiệp vụ 07 — Phụ tùng & Kho](#9-nghiệp-vụ-07--phụ-tùng-và-quản-lý-kho) | Parts, PO, tồn kho |
| 10 | [Nghiệp vụ 08 — Thi công](#10-nghiệp-vụ-08--thi-công-và-giám-sát-tiến-độ) | Production control |
| 11 | [Nghiệp vụ 09 — QC & Nghiệm thu](#11-nghiệp-vụ-09--kiểm-tra-chất-lượng-qc-và-nghiệm-thu) | Quality gate |
| 12 | [Nghiệp vụ 10 — Bàn giao & Thanh toán](#12-nghiệp-vụ-10--bàn-giao-thanh-toán-và-hóa-đơn) | Delivery, invoice |
| 13 | [Nghiệp vụ 11 — Bảo hành dịch vụ](#13-nghiệp-vụ-11--bảo-hành-dịch-vụ-và-xử-lý-comeback) | Warranty, comeback |
| 14 | [Nghiệp vụ 12 — CSKH sau dịch vụ](#14-nghiệp-vụ-12--chăm-sóc-sau-dịch-vụ-và-nhắc-lịch) | Follow-up, reminder |
| 15 | [Nghiệp vụ 13 — Bảo hiểm](#15-nghiệp-vụ-13--sửa-chữa-xe-bảo-hiểm) | Insurance job |
| 16 | [Nghiệp vụ 14 — Kế toán & Công nợ](#16-nghiệp-vụ-14--kế-toán-công-nợ-và-dòng-tiền) | AR/AP, cash |
| 17 | [Nghiệp vụ 15 — Nhân sự & Năng suất](#17-nghiệp-vụ-15--nhân-sự-chấm-công-và-năng-suất-thợ) | HR, payroll |
| 18 | [Nghiệp vụ 16 — Báo cáo & KPI](#18-nghiệp-vụ-16--báo-cáo-quản-trị-và-kpi) | BI |
| 19 | [Nghiệp vụ 17 — Phân quyền & Kiểm soát](#19-nghiệp-vụ-17--phân-quyền-và-kiểm-soát-nội-bộ) | RBAC, audit |
| 20 | [Tuân thủ pháp lý VN](#20-tuân-thủ-pháp-lý-tại-việt-nam) | Legal |
| 21 | [State machine & Mô hình dữ liệu](#21-state-machine-và-mô-hình-dữ-liệu-tối-thiểu) | Data model |
| 22 | [Ma trận RACI](#22-ma-trận-raci) | Trách nhiệm |
| 23 | [Danh mục chứng từ](#23-danh-mục-chứng-từ-bắt-buộc) | Documents |
| 24 | [Checklist mức độ trưởng thành](#24-checklist-mức-độ-trưởng-thành-maturity) | Maturity |

---

## 0. NGUỒN THAM CHIẾU VÀ MỨC ĐỘ TIN CẬY

| # | Nguồn | Loại | Mức tin cậy | Dùng cho phần |
|---|-------|------|-------------|---------------|
| S1 | [Toyota — 7 Steps of Service Operation](https://archive.org/stream/Toyota7StepsServiceOperation/Toyota-7-Steps-Service-Operation_djvu.txt) | Tài liệu đào tạo hãng xe | ★★★★★ | Khung 7 bước, KPI, chuẩn RO, QC |
| S2 | [Nghị định 116/2017/NĐ-CP — Chính phủ Việt Nam](https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=191464) | Văn bản pháp quy | ★★★★★ | Điều kiện cơ sở bảo hành, bảo dưỡng |
| S3 | [TCVN 11794:2017 — áp dụng cho cơ sở BH-BD ô tô](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/thong-bao-van-ban-moi/email/18112/ap-dung-tcvn-11794-2017-voi-co-so-bao-hanh-bao-duong-o-to) | Tiêu chuẩn quốc gia | ★★★★★ | Mặt bằng, thiết bị, nhân lực, QMS |
| S4 | [Luật Bảo vệ quyền lợi người tiêu dùng 2023 (19/2023/QH15)](https://thuvienphapluat.vn/van-ban/Thuong-mai/Luat-Bao-ve-quyen-loi-nguoi-tieu-dung-2023-19-2023-QH15-500102.aspx) | Luật | ★★★★★ | Quyền được cung cấp hóa đơn, chứng từ; bảo hành |
| S5 | [Nghị định 70/2025/NĐ-CP sửa đổi NĐ 123/2020 về hóa đơn, chứng từ](https://baochinhphu.vn/nhung-noi-dung-moi-cua-nghi-dinh-so-70-2025-nd-cp-ve-hoa-don-chung-tu-102250903091616929.htm) | Văn bản pháp quy | ★★★★★ | Hóa đơn điện tử, thời điểm lập hóa đơn |
| S6 | [California BAR — Automotive Repair Act (BPC §9884.9) / "Write It Right"](https://www.bar.ca.gov/pdf/workshops/202301-automotive-repair-transactions/presentation.pdf) | Cơ quan quản lý nhà nước (Hoa Kỳ) | ★★★★★ | Chuẩn pháp lý về báo giá, phê duyệt bổ sung, hóa đơn |
| S7 | [MySyara — The Auto Repair Shop Workflow, End to End (2026)](https://os.mysyara.com/blog/auto-repair-shop-workflow) | Nhà cung cấp phần mềm DMS | ★★★★ | Luồng trạng thái, handoff, exception path |
| S8 | [Tekmetric — Repair tracking workflow / DVI](https://www.tekmetric.com/post/repair-tracking-software-workflow) | Nhà cung cấp SMS hàng đầu Bắc Mỹ | ★★★★ | Workflow board, DVI |
| S9 | [AutoVitals — DVI Best Practices & KPI](https://blog.autovitals.com/digital-vehicle-inspection-best-practices) | Nhà cung cấp DVI | ★★★★ | Quy trình DVI, KPI |
| S10 | [Autobody News — Quality Control in 6 Easy Steps](https://www.autobodynews.com/index.php/dave-luehr/item/11676-quality-control-in-6-easy-steps.html) | Tạp chí chuyên ngành | ★★★★ | Quy trình QC |
| S11 | [VATC — Quy trình tiếp nhận sửa chữa ô tô chuẩn tại gara](https://oto.edu.vn/quy-trinh-tiep-nhan-sua-chua-o-to/) | Trung tâm đào tạo kỹ thuật ô tô VN | ★★★★ | Bối cảnh Việt Nam |
| S12 | [VC Garage — 7 bước chuẩn quy trình sửa chữa ô tô](https://vcgarage.com/quy-trinh-sua-chua-xe-o-to/) | Chuỗi gara VN | ★★★☆ | Bối cảnh Việt Nam, benchmark thời gian |
| S13 | [Bảo hiểm Bảo Việt — Quy trình bồi thường bảo hiểm xe cơ giới](https://ibaoviet.vn/quy-trinh-boi-thuong-bao-hiem-xe-co-gioi/) | Doanh nghiệp bảo hiểm | ★★★★★ | Nghiệp vụ bảo hiểm, bảo lãnh thanh toán |
| S14 | [VinFast — Quy trình giám định bồi thường bảo hiểm xe ô tô](https://vinfastauto.com/vn_vi/quy-trinh-giam-dinh-boi-thuong-bao-hiem-xe-o-to) | Hãng xe | ★★★★ | Nghiệp vụ giám định |
| S15 | [Optimum / Dealer1 — Parts inventory, core charge, warranty return](https://www.optimumhq.com/blog/automotive-parts-inventory-management) | Chuyên gia ERP phụ tùng | ★★★★ | Kho phụ tùng, core, trả bảo hành |
| S16 | [KaizenCPAs / AutoFix — Auto Repair Shop KPIs](https://www.kaizencpas.com/auto/repair-shop-kpis-profitability) | Hãng kiểm toán chuyên ngành ô tô | ★★★★ | Công thức KPI tài chính |

> **Ghi chú về cách dùng nguồn:** Khung xương của tài liệu lấy từ **S1 (Toyota 7 Steps)** vì đây là chuẩn công nghiệp được nhiều hãng xe áp dụng. Các ràng buộc **bắt buộc về pháp lý** lấy từ S2–S5 (Việt Nam) và S6 (chuẩn tham chiếu quốc tế nghiêm ngặt nhất về minh bạch báo giá). Chi tiết vận hành số hóa lấy từ S7–S10, S15.

---

## 1. TỔNG QUAN MÔ HÌNH VẬN HÀNH GARA

### 1.1. Dòng giá trị (Value Stream)

```
KHÁCH HÀNG                                                          KHÁCH HÀNG
    │                                                                    ▲
    ▼                                                                    │
[1] Đặt lịch → [2] Tiếp nhận → [3] Kiểm tra/DVI → [4] Báo giá → [5] Duyệt
                                                                         │
                                                                         ▼
[10] CSKH ← [9] Bàn giao/Thu tiền ← [8] QC ← [7] Thi công ← [6] Lệnh sửa chữa
                                              ▲        │
                                              │        ▼
                                        [K] Kho phụ tùng / Mua hàng
```

### 1.2. Các vai trò chuẩn trong gara

| Vai trò | Tên tiếng Anh | Trách nhiệm chính |
|---------|---------------|-------------------|
| **Khách hàng** | Customer | Cung cấp thông tin, phê duyệt báo giá, thanh toán, nhận xe |
| **Lễ tân / CSKH** | Receptionist / CSR | Nhận cuộc gọi, đặt lịch, xác nhận lịch hẹn, follow-up |
| **Cố vấn dịch vụ** | Service Advisor (SA) | Chủ sở hữu của Repair Order. Tiếp nhận, tư vấn, báo giá, xin phê duyệt, cập nhật tiến độ, bàn giao |
| **Điều phối viên** | Dispatcher / Foreman | Phân công thợ, cân bằng tải xưởng, theo dõi tiến độ khoang |
| **Kỹ thuật viên** | Technician | Kiểm tra, chẩn đoán, thi công, ghi nhận giờ công, báo phát sinh |
| **Tổ trưởng / KCS** | Foreman / QC Inspector | Kiểm tra chất lượng cuối, chạy thử, ký nghiệm thu |
| **Nhân viên phụ tùng** | Parts Advisor | Kiểm tồn, xuất kho, đặt hàng NCC, nhập kho, trả hàng |
| **Thủ kho** | Storekeeper | Nhập/xuất/kiểm kê vật lý, quản lý vị trí kho |
| **Kế toán / Thủ quỹ** | Accountant / Cashier | Xuất hóa đơn, thu tiền, công nợ, đối chiếu bảo hiểm |
| **Quản lý dịch vụ** | Service Manager | Duyệt ngoại lệ (giảm giá, bảo hành), giám sát KPI |
| **Chủ gara / Admin** | Owner / Admin | Cấu hình hệ thống, phân quyền, xem báo cáo tổng thể |
| **Giám định viên BH** | Insurance Surveyor | Giám định tổn thất, duyệt hạng mục bảo hiểm, phát hành bảo lãnh |

### 1.3. Ba luồng nghiệp vụ song song

Một hệ thống quản lý gara đầy đủ **không phải một luồng duy nhất** mà là ba luồng chạy song song và giao cắt nhau:

1. **Luồng Công việc (Job flow):** Lịch hẹn → RO → Thi công → QC → Bàn giao
2. **Luồng Vật tư (Material flow):** Nhu cầu phụ tùng → Kiểm tồn → Đặt hàng → Nhập → Xuất cho RO → Trả/Bảo hành
3. **Luồng Tiền (Money flow):** Báo giá → Phê duyệt → Hóa đơn → Thu tiền/Công nợ → Ghi nhận doanh thu → Giá vốn → Lãi gộp

> **Nguyên tắc vàng:** Ba luồng phải **khóa chéo (cross-lock)** với nhau. Không xuất kho khi chưa có RO đã duyệt. Không xuất hóa đơn khi RO chưa QC-pass. Không đóng RO khi còn phụ tùng chưa quyết toán.

---

## 2. KHUNG QUY TRÌNH CỐT LÕI 7 BƯỚC

Nguồn: **S1 (Toyota 7 Steps of Service Operation)**, đối chiếu chéo với **S7 (MySyara)** và **S11/S12 (thực tiễn Việt Nam)**.

| Bước | Tên (Toyota) | Tên (thông dụng) | Đầu vào | Đầu ra | Người chịu trách nhiệm |
|------|--------------|------------------|---------|--------|------------------------|
| 1 | Appointments | Đặt lịch hẹn | Yêu cầu KH | Lịch hẹn đã xác nhận, phụ tùng đã đặt trước | CSR / SA |
| 2 | Reception | Tiếp nhận | Xe đến xưởng | Biên bản tiếp nhận + chữ ký ủy quyền | SA |
| 3 | Repair Order Compilation | Lập lệnh sửa chữa | Yêu cầu + kết quả kiểm tra | RO có số hiệu, đã báo giá & duyệt | SA |
| 4 | Dispatch & Production | Điều phối & Thi công | RO đã duyệt | Công việc hoàn tất, giờ công đã ghi | Dispatcher + KTV |
| 5 | Quality Control | Kiểm tra chất lượng | Xe đã sửa xong | RO có dấu/chữ ký QC | Tổ trưởng / KCS |
| 6 | Service Delivery | Bàn giao | Xe QC-pass | Hóa đơn, thanh toán, xe giao KH | SA + Thủ quỹ |
| 7 | Post-Service Follow-Up | Theo dõi sau dịch vụ | RO đã đóng | Phản hồi KH, lịch bảo dưỡng kế tiếp | CSR |

### 2.1. Chuẩn định lượng của Toyota (S1)

| Chỉ tiêu | Chuẩn |
|----------|-------|
| Tỷ lệ đặt lịch trước (appointment rate) | Không đặt kín > 80% năng lực |
| Công suất dự trữ cho khách vãng lai & xe tồn | 20% |
| Số RO mỗi Cố vấn dịch vụ xử lý/ngày | 15–20 RO |
| Tỷ lệ xe tồn không kế hoạch (carry-over) | < 5% |
| Thời gian liên hệ lại sau dịch vụ | Trong vòng **72 giờ** |
| Số câu hỏi khảo sát follow-up | 5–6 câu |
| Nguyên tắc chất lượng | "Fix It Right the First Time" — không khoan nhượng |
| Cơ chế cân bằng tải | **Heijunka** (san bằng khối lượng công việc) |

### 2.2. Quy trình rút gọn phổ biến tại Việt Nam (S11, S12)

1. Tiếp nhận xe và tư vấn
2. Kiểm tra, chẩn đoán tình trạng
3. Báo giá — khách xác nhận
4. Lập **Lệnh sửa chữa**, chuyển xe cho bộ phận kỹ thuật
5. Thi công (phát sinh → báo lại SA → SA báo khách → duyệt bổ sung)
6. Chạy thử + vệ sinh xe (rửa, hút bụi)
7. Bàn giao — thanh toán — lưu hồ sơ vào lịch sử xe
8. Chăm sóc sau dịch vụ (liên hệ lại sau 7–10 ngày)

> **Khác biệt cần lưu ý:** Quy trình Việt Nam nhấn mạnh thêm **vệ sinh xe trước bàn giao** như một bước bắt buộc (S11, S12), trong khi khung Toyota gộp nó vào QC. Hệ thống nên coi "vệ sinh/rửa xe" là một **hạng mục công việc có định mức giờ công** chứ không phải việc làm thêm tùy hứng.

---

## 3. NGHIỆP VỤ 01 — QUẢN LÝ KHÁCH HÀNG VÀ HỒ SƠ XE

### 3.1. Nguyên tắc mô hình dữ liệu

> **Quan hệ Khách hàng ↔ Xe là nhiều-nhiều theo thời gian.** Một khách có nhiều xe; một xe có thể đổi chủ. Hệ thống **không được** gắn cứng xe vào một khách hàng duy nhất mà cần bảng trung gian `vehicle_ownership` có `from_date` / `to_date`.
>
> **Khóa định danh xe là VIN, không phải biển số.** Biển số có thể thay đổi (đổi tỉnh, đổi màu biển, xe kinh doanh vận tải). Toyota (S1) yêu cầu RO phải ghi **VIN, model, ngày sản xuất, ngày đăng ký, số km (odometer)**.

### 3.2. Hồ sơ khách hàng — trường dữ liệu tối thiểu

| Nhóm | Trường | Bắt buộc | Ghi chú |
|------|--------|:--------:|---------|
| Định danh | Mã KH, Loại KH (Cá nhân / Doanh nghiệp / Bảo hiểm / Nội bộ) | ✔ | Loại KH quyết định bảng giá & chính sách công nợ |
| Liên hệ | Họ tên, SĐT (chuẩn hóa), Email, Địa chỉ | ✔ | SĐT là khóa tra cứu nhanh nhất tại quầy |
| Hóa đơn | Tên đơn vị, MST, Địa chỉ xuất HĐ, Email nhận HĐĐT | Nếu là DN | Bắt buộc cho hóa đơn điện tử (S5) |
| Thương mại | Nhóm giá áp dụng, Hạn mức công nợ, Kỳ hạn thanh toán | | Chặn tạo RO nợ khi vượt hạn mức |
| Marketing | Nguồn khách, Đồng ý nhận thông báo (SMS/Zalo/Email) | | Cần cho CSKH & tuân thủ quyền riêng tư |
| Lịch sử | Tổng số lần vào xưởng, Tổng chi tiêu, Lần cuối vào xưởng | Tự tính | Nền tảng cho phân khúc & nhắc lịch |

### 3.3. Hồ sơ xe — trường dữ liệu tối thiểu

| Nhóm | Trường | Bắt buộc | Ghi chú |
|------|--------|:--------:|---------|
| Định danh | **VIN/Số khung**, Số máy, Biển số | ✔ | VIN là khóa chính nghiệp vụ |
| Kỹ thuật | Hãng, Dòng, Phiên bản, Năm SX, Màu, Kiểu thân xe | ✔ | Dùng để lọc phụ tùng tương thích |
| Động lực | Loại nhiên liệu, Dung tích, Hộp số, Dẫn động | | Quyết định định mức dầu, lọc |
| Vận hành | Odometer hiện tại + **lịch sử odometer theo thời gian** | ✔ | Cơ sở tính chu kỳ bảo dưỡng & phát hiện tua công-tơ-mét |
| Pháp lý | Ngày đăng ký, Hạn đăng kiểm, Hạn bảo hiểm TNDS, Hạn BH thân vỏ | | Nguồn nhắc việc CSKH có giá trị cao |
| Bảo hành | Ngày bán, Hạn bảo hành hãng (thời gian / km) | | Quyết định job type là Warranty hay Paid |
| Hồ sơ | Ảnh xe, Ảnh giấy tờ, Ghi chú đặc thù (đã độ, đã va chạm...) | | |
| Lịch sử | Toàn bộ RO đã thực hiện, phụ tùng đã thay, khuyến nghị đã từ chối | Tự sinh | **Bắt buộc** — Toyota yêu cầu SA xem lịch sử trước khi tiếp nhận (S1 Step 2) |

### 3.4. Quy tắc nghiệp vụ

- **BR-CUS-01:** Chống trùng khách hàng — khi tạo mới, hệ thống phải cảnh báo nếu trùng SĐT hoặc trùng (Tên + MST).
- **BR-CUS-02:** Chống trùng xe — VIN là duy nhất toàn hệ thống; biển số duy nhất trong số các xe **đang hoạt động**.
- **BR-CUS-03:** Odometer chỉ được tăng. Nếu nhập nhỏ hơn giá trị lần trước → yêu cầu xác nhận + ghi log lý do.
- **BR-CUS-04:** Không được xóa cứng khách hàng/xe đã có RO. Chỉ được vô hiệu hóa (soft delete) để bảo toàn lịch sử.
- **BR-CUS-05:** Gộp trùng (merge) khách hàng phải chuyển toàn bộ xe, RO, công nợ sang bản ghi đích và ghi audit log.

---

## 4. NGHIỆP VỤ 02 — ĐẶT LỊCH HẸN VÀ HOẠCH ĐỊNH NĂNG LỰC

### 4.1. Mục tiêu (S1 Step 1)

Đặt lịch **không phải chỉ là ghi giờ hẹn**. Bốn mục tiêu thực sự:
1. **Kiểm soát lưu lượng** để tránh ùn tắc quầy tiếp nhận vào giờ cao điểm.
2. **Phân bổ đủ thời gian** cho SA nhận diện nhu cầu (không tiếp nhận vội).
3. **Xác nhận phụ tùng có sẵn trước khi xe đến** — đây là điểm khác biệt lớn nhất giữa gara chuyên nghiệp và gara nghiệp dư.
4. **Giám sát giờ công kỹ thuật viên** để không nhận quá tải.

### 4.2. Các kênh đặt lịch

| Kênh | Đặc điểm | Yêu cầu hệ thống |
|------|----------|------------------|
| Điện thoại / Trực tiếp | Chủ đạo tại VN | Form nhập nhanh, tìm KH theo SĐT |
| Website / App khách hàng | Tăng dần | Chọn dịch vụ, khung giờ còn trống, xác nhận tự động |
| Zalo OA / Messenger | Phổ biến tại VN | Webhook tạo lịch |
| Chủ động gọi ra (từ nhắc lịch bảo dưỡng) | Nguồn doanh thu ổn định | Sinh danh sách gọi từ chu kỳ bảo dưỡng |

### 4.3. Bài toán năng lực (Capacity / Time Bucket)

Đây là phần **hầu hết hệ thống làm sai hoặc bỏ qua**. Chuẩn Toyota:

```
Năng lực khả dụng trong ngày (giờ)
  = Số KTV × Số giờ làm việc × Hệ số hiệu suất dự kiến
  − Giờ đã cam kết cho xe tồn (carry-over)
  − 20% dự trữ cho khách vãng lai & phát sinh
```

- Mỗi loại dịch vụ có **định mức giờ công (flat-rate time)** — bao gồm cả thời gian kiểm tra và rửa xe (S1 Step 4).
- Khi đặt lịch, hệ thống trừ định mức giờ của dịch vụ đó khỏi "time bucket" của ngày.
- Ngoài giờ công còn phải kiểm tra **nguồn lực vật lý**: số khoang (bay), cầu nâng, buồng sơn, máy chẩn đoán chuyên dụng.

### 4.4. Trạng thái lịch hẹn

```
DRAFT → SCHEDULED → CONFIRMED → ARRIVED → CONVERTED_TO_RO
                  ↘ RESCHEDULED ↗
                  ↘ NO_SHOW
                  ↘ CANCELLED
```

### 4.5. Quy tắc nghiệp vụ

- **BR-APT-01:** Không cho đặt lịch vượt quá năng lực còn lại của khung giờ (hoặc cho phép nhưng cảnh báo rõ và yêu cầu quyền quản lý).
- **BR-APT-02:** Khi đặt lịch cho dịch vụ có phụ tùng đặc thù → tự động tạo **yêu cầu kiểm tra tồn kho / đặt trước phụ tùng (parts pre-order)**.
- **BR-APT-03:** Nhắc lịch tự động cho khách trước 24h (SMS/Zalo) — giảm tỷ lệ no-show.
- **BR-APT-04:** No-show phải được ghi nhận và **đưa vào danh sách gọi lại để đặt lịch mới** (S1 yêu cầu rõ điều này).
- **BR-APT-05:** Không cho phép đặt trùng KTV / trùng khoang trong cùng khung giờ.
- **BR-APT-06:** Lịch hẹn hủy trong vòng X giờ phải ghi lý do (phục vụ phân tích).

---

## 5. NGHIỆP VỤ 03 — TIẾP NHẬN XE (RECEPTION / CHECK-IN)

### 5.1. Các bước chuẩn (S1 Step 2 + S11)

| # | Hoạt động | Chi tiết |
|---|-----------|----------|
| 1 | Đón khách | Chào trong vòng 30 giây kể từ khi xe vào sân. SA đeo bảng tên. |
| 2 | Tra cứu lịch sử | **Xem lịch sử dịch vụ trước khi hỏi khách** — thể hiện sự chuyên nghiệp, tránh hỏi lại. |
| 3 | Khai thác triệu chứng | Áp dụng quy tắc **5W-2H** |
| 4 | Đi vòng quanh xe (Walk-around) | Ghi nhận tình trạng ngoại thất, xước/móp có sẵn, ảnh chụp 4 góc + odometer |
| 5 | Kiểm kê tài sản trên xe | Đồ đạc cá nhân, phụ kiện, lốp dự phòng, giấy tờ để lại |
| 6 | Bảo vệ xe | Bọc ghế, trải thảm sàn, bọc vô lăng, bọc cần số |
| 7 | Thống nhất kỳ vọng | Thời gian dự kiến, cách thức liên lạc, phương thức thanh toán |
| 8 | Lấy chữ ký ủy quyền | **Bắt buộc** — chữ ký cho phép gara tác nghiệp và giữ xe |

### 5.2. Bộ câu hỏi chẩn đoán 5W-2H (S1)

| Câu hỏi | Nội dung khai thác |
|---------|--------------------|
| **What** | Hiện tượng gì? (tiếng kêu, rung, mùi, đèn báo, chảy dầu...) |
| **When** | Xảy ra khi nào? (máy nguội/nóng, khi phanh, khi vào cua, buổi sáng...) |
| **Where** | Vị trí trên xe? Đường loại gì? |
| **Who** | Ai lái khi xảy ra? |
| **Why** | Khách nghi nguyên nhân do đâu? Đã sửa ở đâu chưa? |
| **How** | Xảy ra như thế nào? Đột ngột hay từ từ? |
| **How much/often** | Tần suất? Luôn luôn hay thỉnh thoảng? Ở tốc độ nào? |

> Đây là dữ liệu **có cấu trúc**, không nên chỉ lưu trong một ô "ghi chú" tự do. Chẩn đoán đúng phụ thuộc gần như hoàn toàn vào chất lượng bước này.

### 5.3. Biên bản tiếp nhận xe — nội dung bắt buộc

- Thông tin KH & xe, odometer khi vào
- Mức nhiên liệu khi vào
- **Sơ đồ thân xe đánh dấu hư hại có sẵn** (chống tranh chấp)
- Danh sách tài sản/phụ kiện trên xe
- Yêu cầu của khách (nguyên văn)
- Thời gian dự kiến hoàn thành
- Điều khoản: quyền tác nghiệp, quyền giữ xe khi chưa thanh toán, giới hạn trách nhiệm với tài sản để lại
- **Chữ ký khách hàng + chữ ký SA + thời điểm**

### 5.4. Quy tắc nghiệp vụ

- **BR-REC-01:** Không được chuyển sang bước chẩn đoán khi chưa có chữ ký ủy quyền tiếp nhận.
- **BR-REC-02:** Ảnh walk-around là **bắt buộc tối thiểu 6 ảnh** (4 góc + odometer + khoang máy) và phải gắn timestamp không sửa được.
- **BR-REC-03:** Odometer khi vào là trường bắt buộc, không cho để trống.
- **BR-REC-04:** Xe kéo về (tow-in) phải được đánh dấu riêng vì không thể chạy thử ngay.
- **BR-REC-05 (theo S6/BAR):** Phí kéo xe/cứu hộ phải được **báo giá và phê duyệt riêng**, tách khỏi báo giá sửa chữa.

---

## 6. NGHIỆP VỤ 04 — KIỂM TRA VÀ CHẨN ĐOÁN (INSPECTION / DVI)

### 6.1. Ba loại kiểm tra khác nhau — không được nhầm lẫn

| Loại | Mục đích | Tính phí | Sản phẩm đầu ra |
|------|----------|----------|-----------------|
| **Kiểm tra nhanh khi tiếp nhận** | Xác nhận triệu chứng | Không | Ghi chú tiếp nhận |
| **Kiểm tra đa điểm (MPI)** | Rà soát tổng thể tình trạng xe theo checklist | Thường miễn phí (công cụ bán hàng) | Báo cáo tình trạng theo màu Xanh/Vàng/Đỏ |
| **Chẩn đoán chuyên sâu** | Tìm nguyên nhân gốc của lỗi phức tạp | **Có tính phí giờ chẩn đoán** | Kết luận nguyên nhân + phương án |

> **S6 (California BAR)** yêu cầu: trước khi thực hiện **chẩn đoán bổ sung** phát sinh chi phí, phải báo giá và xin phê duyệt riêng. Nghĩa là "phí chẩn đoán" cũng là một hạng mục cần khách duyệt.

### 6.2. Digital Vehicle Inspection (DVI) — chuẩn hiện đại (S8, S9)

Đặc điểm bắt buộc của một DVI đạt chuẩn:

1. **Checklist theo mẫu (template) có thể tùy biến** theo loại dịch vụ và hệ thống trên xe (phanh, treo, lốp, dầu nhớt, điện, làm mát, gầm...).
2. **Phân loại 3 màu:**
   - 🟢 **Xanh** — Đạt, không cần xử lý
   - 🟡 **Vàng** — Cần theo dõi / nên làm trong tương lai gần
   - 🔴 **Đỏ** — Không an toàn / cần xử lý ngay
3. **Ảnh và video minh chứng gắn với từng điểm kiểm tra** — đây là yếu tố tạo niềm tin quyết định.
4. **Ghi chú kỹ thuật viên** cho từng mục không đạt.
5. **Đo lường định lượng:** độ dày má phanh (mm), gai lốp (mm), điện áp ắc-quy (V), tình trạng dầu.
6. **Gửi báo cáo cho khách qua link/SMS/Zalo**, khách xem trên điện thoại.
7. **SA gọi điện theo sau** để giải thích, không chỉ gửi rồi thôi (S9 nhấn mạnh).

### 6.3. Giá trị nghiệp vụ của các mục "Vàng"

Các hạng mục 🟡 mà khách **từ chối** ở lần này phải được lưu thành **"Khuyến nghị bị hoãn" (Deferred Work / Declined Job)** gắn với xe, để:
- Lần vào xưởng sau, SA nhắc lại ngay.
- Sinh chiến dịch CSKH gọi lại sau N ngày.
- Là nguồn doanh thu tiềm năng đã được định lượng.

> Đây là một trong những tính năng **giá trị cao nhất** của một hệ thống quản lý gara và thường bị bỏ sót.

### 6.4. Quy tắc nghiệp vụ

- **BR-INS-01:** Mỗi hạng mục DVI phải có trạng thái (Đạt/Theo dõi/Không đạt); không cho hoàn tất DVI nếu còn mục chưa đánh giá.
- **BR-INS-02:** Hạng mục 🔴 bắt buộc phải có ảnh minh chứng.
- **BR-INS-03:** Kết quả DVI phải chuyển hóa được thành **dòng báo giá** chỉ bằng một thao tác (một-chạm chuyển thành hạng mục báo giá).
- **BR-INS-04:** Mục bị khách từ chối → tự động ghi vào Deferred Work với ngày dự kiến nhắc lại.
- **BR-INS-05:** Phí chẩn đoán chuyên sâu phải được báo giá & duyệt trước khi thực hiện.

---

## 7. NGHIỆP VỤ 05 — BÁO GIÁ VÀ PHÊ DUYỆT (ESTIMATE / AUTHORIZATION)

Đây là nghiệp vụ **nhạy cảm pháp lý nhất** trong toàn bộ hệ thống.

### 7.1. Yêu cầu pháp lý về báo giá (S6 — California BAR, chuẩn tham chiếu nghiêm ngặt)

Trước khi bắt đầu bất kỳ công việc nào, gara phải cung cấp **báo giá bằng văn bản** gồm:
- Mô tả vấn đề/triệu chứng
- Danh sách phụ tùng cần thiết (nêu rõ **mới / cũ / tái chế / phục hồi**)
- Chi phí nhân công
- **Tổng chi phí dự kiến**

và **khách hàng phải phê duyệt trước khi bắt đầu công việc**.

### 7.2. Yêu cầu pháp lý về phê duyệt bổ sung — CỰC KỲ QUAN TRỌNG (S6)

> Trước khi thực hiện **bất kỳ chẩn đoán hoặc sửa chữa bổ sung nào**, và trước khi phát sinh **bất kỳ chi phí nhân công hoặc phụ tùng nào vượt quá giá đã báo và đã được duyệt**, gara phải:
> 1. Lập **phiếu công việc sửa đổi (revised work order)** mô tả toàn bộ phụ tùng và nhân công bổ sung;
> 2. Nêu **chi phí của phần bổ sung** và **tổng chi phí mới sau điều chỉnh**;
> 3. Liên hệ khách hàng qua điện thoại / email / tin nhắn;
> 4. **Ghi nhận phê duyệt** kèm: **ngày giờ**, **tên người phê duyệt**, **số điện thoại/email đã liên hệ**, và **mô tả đầy đủ phần bổ sung**.

**Đây chính là nghiệp vụ "Change Order" / "Phê duyệt phát sinh" — không có nó, hệ thống không đạt chuẩn.**

### 7.3. Cấu trúc một báo giá đầy đủ

```
BÁO GIÁ #QT-2026-00123                            Ngày: __/__/____
KH: ____________  Xe: ______ (VIN ____)  Odo: _______ km

── HẠNG MỤC CÔNG VIỆC ────────────────────────────────────────────
[1] Thay má phanh trước
    ├ Nhân công:  1.2 h × 300.000 đ/h        =   360.000 đ
    ├ Phụ tùng:   Má phanh trước (Mới) ×1    =   850.000 đ
    └ Vật tư phụ: Mỡ chịu nhiệt              =    30.000 đ
[2] Thay dầu động cơ + lọc dầu
    ├ Nhân công:  0.5 h × 300.000 đ/h        =   150.000 đ
    ├ Phụ tùng:   Dầu 5W-30 ×4 L             =   960.000 đ
    └ Phụ tùng:   Lọc dầu (Mới) ×1           =   180.000 đ
──────────────────────────────────────────────────────────────────
Cộng nhân công                                     510.000 đ
Cộng phụ tùng & vật tư                           2.020.000 đ
Chi phí khác (xử lý dầu thải, vật tư xưởng)         50.000 đ
Chiết khấu (nếu có)                               −100.000 đ
Thuế GTGT (theo thuế suất hàng/dịch vụ)            ______ đ
════ TỔNG CỘNG ══════════════════════════════════ ________ đ

Thời gian dự kiến hoàn thành: ____________
□ Tôi đồng ý thực hiện các hạng mục trên
Chữ ký khách hàng: ________  Thời điểm: __/__/____ __:__
```

### 7.4. Các loại hạng mục trên báo giá (line types)

| Loại dòng | Ví dụ | Cách tính |
|-----------|-------|-----------|
| **Nhân công (Labor)** | Thay má phanh | Giờ định mức × Đơn giá giờ |
| **Phụ tùng (Part)** | Má phanh | SL × Đơn giá bán |
| **Vật tư tiêu hao (Sublet consumables)** | Mỡ, keo, giẻ lau | Theo % hoặc định mức |
| **Dịch vụ thuê ngoài (Sublet)** | Sơn ngoài, ép ống thủy lực | Giá thuê + markup |
| **Phí chẩn đoán (Diagnostic fee)** | Đo lỗi hộp ECU | Giờ chẩn đoán × đơn giá |
| **Phí môi trường / vật tư xưởng (Shop supplies)** | Xử lý dầu thải | % trên nhân công, có trần |
| **Chiết khấu (Discount)** | Khuyến mãi | Theo dòng hoặc theo tổng |
| **Gói dịch vụ (Package/Combo)** | Gói bảo dưỡng 10.000 km | Giá trọn gói, bung ra thành các dòng con |

### 7.5. Chính sách giá

- **Bảng giá theo nhóm khách:** Lẻ / Doanh nghiệp / Bảo hiểm / Đội xe / Nội bộ.
- **Đơn giá giờ công theo loại việc:** Cơ khí (GJ), Đồng (Body), Sơn (Paint), Điện — điện thân xe, Chẩn đoán.
- **Định mức giờ công (flat rate)** theo dịch vụ + model xe. Không nên để KTV tự khai giờ khi tính tiền khách.
- **Giá phụ tùng:** giá vốn → markup theo bậc (matrix pricing) → giá bán. Cần lưu **cả giá vốn và giá bán** để tính lãi gộp.
- **Quyền giảm giá phân cấp:** SA ≤ 5%, Quản lý dịch vụ ≤ 15%, Chủ gara > 15%.

### 7.6. Trạng thái báo giá

```
DRAFT → SENT → (APPROVED | PARTIALLY_APPROVED | DECLINED | EXPIRED)
                     │
                     └→ REVISED (tạo phiên bản mới, giữ nguyên bản cũ)
```

- **PARTIALLY_APPROVED** là trạng thái **rất quan trọng và hay bị bỏ sót**: khách duyệt hạng mục A, B nhưng từ chối C. Hạng mục C phải chuyển thành *Deferred Work*.
- **Versioning bắt buộc:** không được ghi đè báo giá cũ. Mỗi lần sửa tạo version mới; bản đã duyệt phải bất biến (immutable) để làm bằng chứng.

### 7.7. Quy tắc nghiệp vụ

- **BR-QUO-01:** Không được bắt đầu thi công khi báo giá chưa ở trạng thái APPROVED / PARTIALLY_APPROVED.
- **BR-QUO-02:** Mọi phê duyệt phải lưu: **ai duyệt, lúc nào, qua kênh nào, nội dung được duyệt (snapshot)**.
- **BR-QUO-03:** Chi phí thực tế vượt quá giá đã duyệt → hệ thống **chặn cứng**, buộc tạo Change Order.
- **BR-QUO-04:** Ngưỡng dung sai (tolerance) nếu có (ví dụ +10%) phải là tham số cấu hình, có log, và không áp dụng cho hạng mục mới hoàn toàn.
- **BR-QUO-05:** Báo giá có hạn hiệu lực (thường 7–15 ngày) do giá phụ tùng biến động.
- **BR-QUO-06:** Báo giá đã duyệt phải sinh được RO mà **không nhập lại dữ liệu**.
- **BR-QUO-07:** Hạng mục bị từ chối phải ghi **lý do từ chối** (giá cao / để lần sau / tự sửa nơi khác).

---

## 8. NGHIỆP VỤ 06 — LỆNH SỬA CHỮA (REPAIR ORDER — RO)

**RO là chứng từ trung tâm của toàn bộ hệ thống.** Mọi thứ khác đều tham chiếu đến nó.

### 8.1. Nội dung bắt buộc của RO (S1 Step 3)

| Nhóm | Trường bắt buộc |
|------|-----------------|
| **Khách hàng** | Tên, địa chỉ, liên hệ, **phương thức thanh toán**, **chữ ký** |
| **Xe** | **VIN**, model, ngày sản xuất, ngày đăng ký, **odometer** |
| **Công việc** | Mô tả công việc, **chi phí ước tính**, **thời gian hoàn thành dự kiến**, **phụ tùng thay thế** |
| **Bổ sung** | **Loại công việc (job type)**, thời gian cam kết giao xe, cách thức follow-up mong muốn |

**Chuẩn của Toyota:** thông tin phải *"rõ ràng, dễ đọc và chính xác"*, RO phải được **đánh số theo dãy tuần tự có kiểm soát**, và phải **đồng bộ với bộ phận phụ tùng**.

### 8.2. Loại công việc (Job Type) — phân loại bắt buộc

Đây là trường quyết định **ai trả tiền**:

| Job Type | Người trả tiền | Đặc thù |
|----------|----------------|---------|
| **Customer Pay (CP)** | Khách hàng | Thông thường |
| **Warranty (W)** | Hãng xe | Cần mã lỗi, mã nguyên nhân, số ngày/km bảo hành |
| **Internal (I)** | Chính gara | Xe nội bộ, sửa lại lỗi của mình (comeback) |
| **Insurance (INS)** | Công ty bảo hiểm | Cần biên bản giám định, bảo lãnh |
| **Goodwill / Policy** | Gara chịu một phần | Cần phê duyệt cấp quản lý |
| **Campaign / Recall** | Hãng xe | Theo chiến dịch triệu hồi |

> Một RO có thể có **nhiều job type trên các dòng khác nhau** (split-pay): ví dụ hạng mục A bảo hành hãng, hạng mục B khách tự trả. Đây là yêu cầu bắt buộc ở gara ủy quyền.

### 8.3. Cấu trúc phân cấp của RO

```
RO (Repair Order)
 ├─ RO Line (Hạng mục công việc / Job)   ← đơn vị phê duyệt & QC
 │   ├─ Labor Operation (thao tác nhân công)
 │   │    └─ Time Log (KTV, clock-on, clock-off)
 │   ├─ Part Line (phụ tùng)
 │   │    └─ Stock Issue (phiếu xuất kho)
 │   └─ Sublet Line (thuê ngoài)
 ├─ Attachments (ảnh, DVI, video)
 ├─ Approvals (báo giá gốc + các change order)
 └─ Invoice (hóa đơn sinh ra từ RO)
```

### 8.4. Trạng thái RO (State Machine)

```
                          ┌──────────────────────────────────┐
                          ▼                                  │
 CREATED → INSPECTING → ESTIMATING → AWAITING_APPROVAL → APPROVED
                                            │                 │
                                            │(từ chối)        ▼
                                            ▼          IN_PROGRESS ⇄ WAITING_PARTS
                                        DECLINED             │      ⇄ WAITING_CUSTOMER (change order)
                                            │                │      ⇄ ON_HOLD (khách xin dừng)
                                            ▼                ▼
                                        CANCELLED       WORK_COMPLETED
                                                             │
                                                             ▼
                                                       QC_INSPECTION
                                                        │        │
                                                 (fail) │        │ (pass)
                                                        ▼        ▼
                                                  REWORK →  READY_FOR_DELIVERY
                                                                 │
                                                                 ▼
                                                            INVOICED
                                                                 │
                                                                 ▼
                                                    DELIVERED → CLOSED
```

**Các trạng thái ngoại lệ bắt buộc phải có:**

| Trạng thái | Ý nghĩa | Vì sao bắt buộc |
|------------|---------|-----------------|
| `WAITING_PARTS` | Chờ phụ tùng về | Nguyên nhân số 1 gây xe tồn; phải đo được |
| `WAITING_CUSTOMER` | Chờ khách duyệt phát sinh | Thời gian này **không tính vào hiệu suất KTV** |
| `ON_HOLD` | Tạm dừng theo yêu cầu khách/BH | Tách khỏi WAITING để phân tích đúng |
| `REWORK` | QC không đạt, làm lại | Là cơ sở tính **tỷ lệ comeback nội bộ** |
| `CARRY_OVER` (cờ) | Xe qua đêm ngoài kế hoạch | Toyota chuẩn < 5% |

### 8.5. Điều phối và ghi nhận giờ công (S1 Step 4)

- **Một KTV nhận một RO tại một thời điểm** — chống tình trạng làm dở dang nhiều xe.
- **Ưu tiên:** xe sửa lại (repeat repair) > khách ngồi chờ (waiter) > xe hẹn giờ > xe gửi cả ngày.
- **Clock on / Clock off từng RO** — bắt buộc, đây là dữ liệu gốc để tính hiệu suất.
- **Thời điểm bắt đầu muộn nhất (Latest Start Time)** được tính **ngược từ thời gian cam kết giao xe**. Hệ thống nên cảnh báo khi quá giờ này mà công việc chưa bắt đầu.
- **Bảng điều độ trực quan (visual production board)** hiển thị trạng thái mọi xe và tình trạng bận/rỗi của từng KTV.

### 8.6. Quy tắc nghiệp vụ

- **BR-RO-01:** Số RO tuần tự, không trùng, không nhảy cóc không lý do; format ví dụ `RO-YYYYMM-#####`.
- **BR-RO-02:** RO chỉ được tạo khi đã có KH + Xe + Odometer + chữ ký tiếp nhận.
- **BR-RO-03:** Không cho phép clock-on nếu RO chưa APPROVED.
- **BR-RO-04:** Không cho phép chuyển WORK_COMPLETED nếu còn dòng công việc chưa hoàn tất hoặc còn phụ tùng chưa xuất kho.
- **BR-RO-05:** Không cho phép xuất hóa đơn nếu RO chưa qua QC-pass.
- **BR-RO-06:** RO đã CLOSED là bất biến; muốn sửa phải mở lại (reopen) với quyền quản lý và ghi audit log.
- **BR-RO-07:** Mỗi lần đổi trạng thái phải ghi: ai, lúc nào, từ trạng thái nào sang trạng thái nào, lý do (nếu là ngoại lệ).
- **BR-RO-08:** Thời gian cam kết giao xe (promised time) là **trường bắt buộc**, và mọi thay đổi đều phải thông báo khách + ghi log.

---

## 9. NGHIỆP VỤ 07 — PHỤ TÙNG VÀ QUẢN LÝ KHO

### 9.1. Danh mục phụ tùng (Parts Master)

| Trường | Ghi chú |
|--------|---------|
| Mã phụ tùng (Part No.) | Mã hãng (OEM) là chuẩn |
| Mã thay thế / mã tương đương | Rất quan trọng khi hết hàng OEM |
| Tên, đơn vị tính | |
| Nhóm hàng, hãng sản xuất | Dùng phân tích ABC |
| **Loại:** Mới / Chính hãng / OEM / Aftermarket / Tái chế / Đã qua sử dụng | **Bắt buộc ghi trên hóa đơn theo S6** |
| Xe tương thích (model, năm) | Chống xuất nhầm |
| Vị trí kho (kho — kệ — ô) | |
| Tồn tối thiểu / tối đa (Min-Max), điểm đặt hàng lại | Cơ sở tự động sinh PO |
| Giá vốn (bình quân/FIFO), giá bán, bảng giá theo nhóm KH | |
| Nhà cung cấp chính, lead time | |
| Có tính **core charge** không, giá trị core | S15 |
| Số serial / lô / hạn dùng (dầu, hóa chất, ắc-quy) | Phục vụ triệu hồi & truy vết |

### 9.2. Các nghiệp vụ kho bắt buộc

| Nghiệp vụ | Chứng từ | Ảnh hưởng tồn kho | Ảnh hưởng giá vốn |
|-----------|----------|:-----------------:|:-----------------:|
| Nhập mua từ NCC | Phiếu nhập kho (GRN) | + | Cập nhật giá vốn BQ |
| Trả hàng NCC | Phiếu trả hàng | − | − |
| Xuất cho RO | Phiếu xuất kho | − | Ghi nhận COGS vào RO |
| Trả lại kho từ RO (không dùng đến) | Phiếu nhập trả | + | Hoàn COGS |
| Chuyển kho | Phiếu chuyển kho | ± | Không đổi |
| Kiểm kê | Biên bản kiểm kê | ± chênh lệch | Ghi nhận thừa/thiếu |
| Điều chỉnh (hỏng, mất, hết hạn) | Phiếu điều chỉnh | − | Chi phí |
| **Trả bảo hành NCC** | Phiếu trả bảo hành | − / + | Theo dõi credit từ NCC |
| **Quản lý core (vỏ cũ)** | Phiếu thu hồi core | Kho core riêng | Thu hồi tiền cọc core |

### 9.3. Chu trình mua hàng (Procurement)

```
Nhu cầu (từ RO / Min-Max / Đặt trước theo lịch hẹn)
   → Yêu cầu mua hàng (PR)
   → So sánh NCC (giá, lead time, chính sách trả hàng)
   → Đơn đặt hàng (PO) → gửi NCC
   → Theo dõi tiến độ (partial delivery, backorder)
   → Nhận hàng + Kiểm hàng (GRN)
   → Đối chiếu 3 chiều: PO ↔ GRN ↔ Hóa đơn NCC
   → Ghi nhận công nợ phải trả (AP)
```

**Điểm hay bị bỏ sót:**
- **Nhận hàng từng phần (partial receipt)** — thực tế NCC hiếm khi giao đủ một lần.
- **Backorder** — phụ tùng chưa về phải liên kết ngược lại RO đang chờ để tự động cập nhật `WAITING_PARTS`.
- **Đặt hàng riêng cho một RO cụ thể (special order)** — hàng về là dành riêng cho xe đó, không được để KTV khác lấy dùng.

### 9.4. Core charge (phụ tùng có vỏ cũ đổi trả) — S15

Với các chi tiết tái chế (máy phát, đề, càng phanh, thước lái...), khách bị tính thêm **tiền cọc vỏ (core charge)** trên hóa đơn. Khi trả vỏ cũ về NCC, gara nhận lại tiền. Nếu không theo dõi, gara mất tiền hàng tháng.

**Hệ thống cần:** cờ `is_core_item`, `core_value`, kho core riêng, trạng thái core (Đã thu từ xe → Chờ trả NCC → Đã trả → Đã nhận credit).

### 9.5. Quy tắc nghiệp vụ

- **BR-PRT-01:** Không cho xuất kho quá tồn khả dụng (available = tồn thực tế − đã giữ chỗ cho RO khác).
- **BR-PRT-02:** Phải có cơ chế **giữ chỗ (reservation/allocation)** phụ tùng cho RO đã duyệt.
- **BR-PRT-03:** Giá vốn tại thời điểm xuất phải được **đóng băng vào dòng RO** (không đổi theo giá vốn tương lai) — nếu không, báo cáo lãi gộp quá khứ sẽ sai.
- **BR-PRT-04:** Xuất kho phải tham chiếu RO; không có "xuất trôi nổi".
- **BR-PRT-05:** Kiểm kê phải khóa giao dịch trong thời gian kiểm.
- **BR-PRT-06:** Hàng đặt riêng cho RO không được cấp cho RO khác nếu chưa có phê duyệt.
- **BR-PRT-07:** Cảnh báo tồn dưới mức tối thiểu và tự sinh đề xuất PO.
- **BR-PRT-08:** Theo dõi phụ tùng chết (dead stock — không xuất trong N tháng) để thanh lý.

---

## 10. NGHIỆP VỤ 08 — THI CÔNG VÀ GIÁM SÁT TIẾN ĐỘ

### 10.1. Vòng đời một hạng mục công việc

```
ASSIGNED → STARTED (clock-on) → [PAUSED (chờ phụ tùng/chờ khách)] → FINISHED (clock-off)
```

### 10.2. Ghi nhận của kỹ thuật viên

Với mỗi hạng mục, KTV phải ghi (đây là dữ liệu bảo hành và pháp lý):

| Trường | Mục đích |
|--------|----------|
| **Cause** — Nguyên nhân | Vì sao hỏng |
| **Correction** — Đã làm gì | Nội dung khắc phục thực tế |
| **Complaint** — Triệu chứng ban đầu | (3C — chuẩn của hồ sơ bảo hành hãng) |
| Phụ tùng thực tế đã dùng | Có thể khác báo giá → phải cập nhật |
| Giờ công thực tế | So với định mức để tính hiệu suất |
| Ảnh trong quá trình làm | Bằng chứng công việc |
| Phát sinh phát hiện thêm | Kích hoạt Change Order |

### 10.3. Xử lý phát sinh (Change Order) — luồng bắt buộc

```
KTV phát hiện hỏng hóc thêm
   → Chụp ảnh + mô tả, ghi vào RO
   → Chuyển RO sang WAITING_CUSTOMER, KTV dừng đồng hồ
   → SA lập báo giá bổ sung (revised estimate: chi phí thêm + TỔNG MỚI)
   → Liên hệ khách (gọi/SMS/Zalo/email)
   → Ghi nhận phê duyệt: ngày giờ + tên người duyệt + kênh liên hệ + nội dung
   → Nếu duyệt: cập nhật RO, kiểm tra phụ tùng, KTV chạy đồng hồ trở lại
   → Nếu từ chối: ghi Deferred Work, tiếp tục phần đã duyệt
```

> Nhắc lại: đây là yêu cầu **bắt buộc theo S6 (BAR)** và là thông lệ chuẩn tại VN theo S11 (*"trong trường hợp phát hiện lỗi hỏng phát sinh cần báo lại cho nhân viên tư vấn để thông tin đến khách hàng"*).

### 10.4. Giám sát tiến độ — bảng điều độ

Bảng Kanban theo trạng thái, mỗi thẻ xe hiển thị:
- Biển số + model, tên KH
- Trạng thái hiện tại + thời gian đã ở trạng thái đó
- KTV đang phụ trách
- **Thời gian cam kết giao xe + đếm ngược** (đỏ khi trễ)
- Cờ: chờ phụ tùng / chờ khách / xe tồn / khách ngồi chờ / VIP

### 10.5. Quy tắc nghiệp vụ

- **BR-JOB-01:** KTV không tự ý làm việc ngoài hạng mục đã duyệt.
- **BR-JOB-02:** Không cho clock-on đồng thời 2 RO cho cùng một KTV (trừ khi cấu hình cho phép và có ghi nhận chia giờ).
- **BR-JOB-03:** Thời gian ở trạng thái `WAITING_*` không tính vào giờ công KTV.
- **BR-JOB-04:** Bắt buộc nhập 3C (Complaint/Cause/Correction) trước khi chuyển WORK_COMPLETED.
- **BR-JOB-05:** Cảnh báo khi giờ thực tế vượt định mức quá X% → tổ trưởng vào xem.
- **BR-JOB-06:** Khách phải được cập nhật tiến độ chủ động ít nhất 1 lần/ngày với xe lưu qua đêm.

---

## 11. NGHIỆP VỤ 09 — KIỂM TRA CHẤT LƯỢNG (QC) VÀ NGHIỆM THU

### 11.1. Nguyên tắc

> **Không ai được tự nghiệm thu công việc của chính mình.** QC phải do **kỹ thuật viên bậc cao hoặc quản lý xưởng** thực hiện trước khi xe được chuyển sang khu bàn giao (S7, S10).

### 11.2. Thứ tự ưu tiên kiểm tra (S1 Step 5)

**Mức 1 — Bắt buộc kiểm tra 100%:**
- Xe sửa lại (repeat repair / comeback)
- Xe có khiếu nại của khách
- Công việc liên quan **an toàn** (phanh, lái, treo, túi khí)

**Mức 2 — Ưu tiên cao:**
- Sửa chữa bảo hành
- Chiến dịch dịch vụ / triệu hồi
- Lỗi liên quan vận hành (driveability)

**Mức 3:**
- Sửa chữa lớn, việc về phanh/hệ thống treo, việc liên quan khí thải

### 11.3. Nội dung kiểm tra (S1 + S10)

| # | Hạng mục kiểm tra |
|---|-------------------|
| 1 | **Đối chiếu mô tả yêu cầu ban đầu của SA với ghi chép công việc của KTV** — đã làm đúng việc khách yêu cầu chưa? |
| 2 | Xác minh phụ tùng đã thay (giữ lại phụ tùng cũ để trình khách) |
| 3 | Kiểm tra tất cả hạng mục trên RO đã hoàn tất |
| 4 | **Chạy thử xe** khi cần (bắt buộc với lỗi vận hành, phanh, treo, tiếng kêu) |
| 5 | Kiểm tra rò rỉ (dầu, nước làm mát, dầu phanh) |
| 6 | Kiểm tra mã lỗi đã được xóa, đèn cảnh báo đã tắt |
| 7 | Kiểm tra siết lực bánh xe theo đúng mô-men |
| 8 | **Vệ sinh xe:** rửa ngoài, hút bụi, tháo bọc ghế/thảm sàn, lau dấu tay dầu mỡ |
| 9 | Kiểm tra không để quên dụng cụ trong khoang máy/gầm |
| 10 | **Đóng dấu / ký xác nhận QC lên RO** |

### 11.4. Xử lý khi QC không đạt

- RO chuyển `REWORK`, ghi rõ lỗi phát hiện, trả về KTV.
- Giờ làm lại **được ghi nhận nhưng KHÔNG tính vào giờ bán cho khách** (nội bộ chịu).
- Thống kê tỷ lệ rework theo KTV → phục vụ đào tạo, không phải để phạt.

### 11.5. Quy tắc nghiệp vụ

- **BR-QC-01:** Người QC ≠ người thực hiện công việc (hệ thống phải chặn).
- **BR-QC-02:** RO không được chuyển `READY_FOR_DELIVERY` khi chưa có bản ghi QC-pass.
- **BR-QC-03:** QC phải ghi: người kiểm, thời điểm, kết quả từng mục, có chạy thử không, quãng đường chạy thử.
- **BR-QC-04:** Với việc liên quan an toàn, QC là **bắt buộc không được bỏ qua** dù cấu hình cho phép skip.

---

## 12. NGHIỆP VỤ 10 — BÀN GIAO, THANH TOÁN VÀ HÓA ĐƠN

### 12.1. Quy trình bàn giao chuẩn (S1 Step 6 + S12)

| # | Hoạt động |
|---|-----------|
| 1 | Xác nhận đã hoàn tất QC trước khi gọi khách |
| 2 | Gọi khách thông báo xe sẵn sàng + tổng chi phí (**không để khách bất ngờ ở quầy**) |
| 3 | Chuẩn bị sẵn hóa đơn, hồ sơ, xe đã ra khu bàn giao |
| 4 | Đón khách ngay khi tới |
| 5 | **Giải thích công việc đã làm** theo từng hạng mục, ngôn ngữ dễ hiểu |
| 6 | **Trình phụ tùng cũ đã thay** (hoặc ảnh) |
| 7 | Đối chiếu: **giá cuối cùng phải khớp với báo giá đã duyệt** |
| 8 | Tư vấn hạng mục cần theo dõi lần sau + **hẹn mốc bảo dưỡng kế tiếp** |
| 9 | Thu tiền, xuất hóa đơn, giao chứng từ bảo hành |
| 10 | Dẫn khách ra xe / giao xe, cảm ơn |

### 12.2. Nội dung bắt buộc của hóa đơn/quyết toán (S6 + S4 + S5)

- Tên, địa chỉ, mã số thuế của gara
- Thông tin khách hàng (và MST nếu là doanh nghiệp)
- Thông tin xe + odometer
- **Liệt kê chi tiết từng phụ tùng, ghi rõ mới / cũ / tái chế / phục hồi**
- **Chi phí nhân công tách riêng**
- Thuế GTGT
- **Tổng thanh toán**
- Điều khoản bảo hành

> **S4 (Luật BVQLNTD 2023):** người tiêu dùng **có quyền được cung cấp hóa đơn, chứng từ, tài liệu liên quan đến giao dịch**. Đây là nghĩa vụ pháp lý, không phải tùy chọn.

### 12.3. Thanh toán

| Phương thức | Yêu cầu hệ thống |
|-------------|------------------|
| Tiền mặt | Phiếu thu, quản lý quỹ ca |
| Chuyển khoản | Đối chiếu sao kê, mã tham chiếu |
| Thẻ / QR (VietQR) | Ghi nhận phí giao dịch nếu có |
| Ví điện tử | |
| **Công nợ (trả sau)** | Kiểm tra hạn mức, kỳ hạn thanh toán |
| **Bảo lãnh bảo hiểm** | Phần bảo hiểm trả + phần khách tự trả (mức miễn thường) |
| **Thanh toán từng phần** | Đặt cọc trước + thanh toán phần còn lại |

**Chia hóa đơn (split billing)** là yêu cầu thực tế phổ biến: một RO có thể sinh ra 2 hóa đơn — một cho bảo hiểm, một cho khách.

### 12.4. Hóa đơn điện tử tại Việt Nam (S5)

- Áp dụng theo **Nghị định 123/2020/NĐ-CP**, được sửa đổi bởi **Nghị định 70/2025/NĐ-CP** (hiệu lực từ **01/6/2025**).
- Nguyên tắc bổ sung quan trọng: hóa đơn phải được lập **không muộn hơn ngày làm việc tiếp theo** kể từ khi phát sinh nghĩa vụ lập hóa đơn.
- Hệ thống cần: tích hợp nhà cung cấp HĐĐT (ký số, phát hành, gửi CQT), lưu trữ mã tra cứu, xử lý **hóa đơn điều chỉnh / thay thế** khi sai sót.

### 12.5. Quy tắc nghiệp vụ

- **BR-INV-01:** Hóa đơn chỉ được lập từ RO đã QC-pass và đã chốt toàn bộ dòng chi phí.
- **BR-INV-02:** Tổng hóa đơn phải khớp báo giá đã duyệt (gốc + các change order). Chênh lệch → chặn và yêu cầu giải trình/phê duyệt.
- **BR-INV-03:** Hóa đơn đã phát hành là bất biến; sửa sai phải bằng hóa đơn điều chỉnh/thay thế, có liên kết ngược.
- **BR-INV-04:** Không giao xe khi chưa thanh toán hoặc chưa được duyệt bán chịu.
- **BR-INV-05:** Mỗi giao dịch thu tiền phải ghi: người thu, thời điểm, phương thức, số tiền, tham chiếu.
- **BR-INV-06:** Phải hỗ trợ hoàn tiền / ghi giảm (credit note) có kiểm soát quyền.

---

## 13. NGHIỆP VỤ 11 — BẢO HÀNH DỊCH VỤ VÀ XỬ LÝ COMEBACK

### 13.1. Ba loại bảo hành khác nhau

| Loại | Người chịu chi phí | Nội dung |
|------|--------------------|----------|
| **Bảo hành phụ tùng của NCC** | Nhà cung cấp | Phụ tùng lỗi → trả NCC lấy credit |
| **Bảo hành dịch vụ của gara** | Gara | Lỗi tay nghề → sửa lại miễn phí (Internal job) |
| **Bảo hành chính hãng** | Hãng xe | Xe còn hạn bảo hành hãng → claim về hãng |

### 13.2. Chính sách bảo hành dịch vụ

Cần cấu hình được theo:
- **Thời gian** (ví dụ 3 tháng) **hoặc** **số km** (ví dụ 5.000 km), điều kiện nào đến trước.
- Khác nhau theo nhóm dịch vụ (bảo dưỡng ≠ sửa chữa lớn ≠ sơn).
- **Chứng từ bảo hành** in kèm hóa đơn, ghi rõ phạm vi, điều kiện loại trừ.

### 13.3. Quy trình xử lý Comeback (xe quay lại vì lỗi cũ)

```
Khách quay lại khiếu nại
  → Tra RO gốc, kiểm tra còn hạn bảo hành không
  → Tạo RO mới, liên kết `parent_ro_id`, đánh dấu `is_comeback = true`
  → Kiểm tra & xác định trách nhiệm:
        ├─ Lỗi tay nghề gara        → Job type = INTERNAL (gara chịu)
        ├─ Lỗi phụ tùng             → Job type = INTERNAL + claim NCC
        ├─ Lỗi khác / khách sử dụng → Job type = CUSTOMER_PAY (giải thích rõ)
  → QC bắt buộc mức 1
  → Ghi nhận vào thống kê comeback rate + phản hồi cho KTV liên quan
```

### 13.4. Quy tắc nghiệp vụ

- **BR-WAR-01:** Hệ thống phải tự nhận diện xe quay lại trong thời hạn bảo hành và cảnh báo cho SA ngay khi tiếp nhận.
- **BR-WAR-02:** RO comeback phải liên kết được với RO gốc và hạng mục gốc.
- **BR-WAR-03:** Chi phí comeback nội bộ phải được **ghi nhận là chi phí**, không được ẩn đi — nếu không, báo cáo lãi gộp bị thổi phồng.
- **BR-WAR-04:** Comeback rate là KPI bắt buộc trong báo cáo quản trị.

---

## 14. NGHIỆP VỤ 12 — CHĂM SÓC SAU DỊCH VỤ VÀ NHẮC LỊCH

### 14.1. Follow-up sau dịch vụ (S1 Step 7)

**Chuẩn Toyota:**
- Phải có **chính sách follow-up bằng văn bản**.
- Liên hệ khách **trong vòng 72 giờ** sau khi giao xe.
- Có **sổ theo dõi phản hồi**.
- Khảo sát giới hạn **5–6 câu**.
- Phải **theo đến cùng** với khách không hài lòng.

**Thực tiễn VN (S12):** liên hệ lại sau **7–10 ngày** để hỏi tình trạng vận hành.

> Khuyến nghị: kết hợp cả hai — gọi ngắn trong 72h để bắt lỗi sớm, và một lần nữa sau 7–10 ngày để xác nhận ổn định.

### 14.2. Các nhóm khiếu nại cần phân loại và thống kê (S1)

1. Thái độ đón tiếp & lịch sự
2. Chất lượng sửa chữa
3. Giá cả
4. Đúng hẹn / thời gian
5. Vệ sinh xe
6. Giải thích công việc khi bàn giao
7. Tiện nghi khu vực khách chờ

### 14.3. Hệ thống nhắc việc (Reminder Engine)

| Loại nhắc | Nguồn dữ liệu | Thời điểm |
|-----------|---------------|-----------|
| Bảo dưỡng định kỳ | Odometer + km/tháng trung bình, hoặc theo thời gian | Trước mốc 1–2 tuần |
| Hạng mục bị hoãn (Deferred Work) | DVI mục 🟡 khách từ chối | Sau 30/60/90 ngày |
| Hết hạn đăng kiểm | Hồ sơ xe | Trước 30 ngày |
| Hết hạn bảo hiểm TNDS / thân vỏ | Hồ sơ xe | Trước 30 ngày |
| Hết hạn bảo hành dịch vụ | RO | Trước 7 ngày |
| Sinh nhật KH / dịp lễ | Hồ sơ KH | |
| Khách lâu không quay lại (lapsed) | Lần cuối vào xưởng > 12 tháng | |

### 14.4. Đo lường hài lòng

- **CSI / CSAT** (điểm hài lòng theo lần dịch vụ)
- **NPS** (mức độ sẵn sàng giới thiệu)
- Tỷ lệ khách quay lại (retention rate)
- Xử lý khiếu nại: ghi nhận → phân loại → gán người xử lý → SLA → đóng → phân tích nguyên nhân gốc

---

## 15. NGHIỆP VỤ 13 — SỬA CHỮA XE BẢO HIỂM

Nguồn: **S13 (Bảo hiểm Bảo Việt)**, **S14 (VinFast)**.

### 15.1. Quy trình chuẩn

| # | Bước | Nội dung | Bên thực hiện |
|---|------|----------|---------------|
| 1 | **Thông báo tổn thất** | Khách gọi hotline bảo hiểm, giữ nguyên hiện trường | Khách hàng |
| 2 | **Giám định tổn thất** | Giám định viên xác định mức độ tổn thất — thường **trong vòng 24 giờ** | Công ty BH |
| 3 | **Thống nhất phương án khắc phục** | Sửa tại hãng / sửa tại gara ngoài / bồi thường tiền nếu tổn thất toàn bộ | BH + Khách |
| 4 | **Lập báo giá gửi bảo hiểm** | Gara lập báo giá theo hạng mục giám định; BH duyệt hoặc cắt giảm hạng mục | Gara ↔ BH |
| 5 | **Thi công** | Phát sinh khi tháo rã phải **giám định bổ sung** trước khi làm | Gara |
| 6 | **Hoàn thiện hồ sơ bồi thường** | Thông tin KH, **biên bản giám định**, **hóa đơn sửa chữa**, biên bản cơ quan chức năng, giấy chứng nhận bảo hiểm, đăng ký xe | Gara + Khách |
| 7 | **Bảo lãnh thanh toán** | BH phát hành bảo lãnh (Bảo Việt: **trong 2 ngày làm việc** tại xưởng liên kết) | Công ty BH |
| 8 | **Nghiệm thu & giao xe** | Khách ký **biên bản nghiệm thu**, hợp đồng, thanh lý (nếu có) và nhận xe | Gara + Khách |
| 9 | **Thu hồi công nợ bảo hiểm** | Gara gửi hồ sơ, theo dõi công nợ, nhận thanh toán | Gara ↔ BH |

### 15.2. Đặc thù cần hỗ trợ trong hệ thống

- **Ba bên trên một RO:** Khách hàng — Gara — Công ty bảo hiểm.
- **Chia chi phí:** phần BH chi trả / phần khách tự trả (**mức miễn thường — deductible**, hạng mục ngoài phạm vi, phần khấu hao vật tư).
- **Giám định bổ sung** khi phát hiện tổn thất ẩn sau khi tháo rã — luồng riêng, không giống Change Order thông thường vì cần chữ ký giám định viên.
- **Bộ hồ sơ bảo hiểm** phải quản lý được: số vụ tổn thất, giám định viên, ngày giám định, ảnh hiện trường, biên bản, bảo lãnh.
- **Công nợ bảo hiểm** thường kéo dài 30–90 ngày → cần báo cáo tuổi nợ (aging) riêng cho từng công ty BH.
- Đặc thù xưởng đồng sơn: hạng mục tính theo **panel** (tấm), có định mức giờ đồng — giờ sơn — vật tư sơn riêng.

---

## 16. NGHIỆP VỤ 14 — KẾ TOÁN, CÔNG NỢ VÀ DÒNG TIỀN

### 16.1. Các sổ cần có

| Sổ | Nội dung |
|----|----------|
| Sổ doanh thu | Theo RO, tách **doanh thu nhân công / phụ tùng / thuê ngoài** |
| Sổ giá vốn (COGS) | Giá vốn phụ tùng xuất + chi phí thuê ngoài + (lương thợ nếu tính vào COGS) |
| Công nợ phải thu (AR) | Theo khách hàng, theo công ty bảo hiểm, có **tuổi nợ** |
| Công nợ phải trả (AP) | Theo nhà cung cấp phụ tùng, đơn vị thuê ngoài |
| Sổ quỹ tiền mặt / ngân hàng | Thu chi hàng ngày, chốt quỹ cuối ca |
| Sổ chi phí vận hành | Mặt bằng, điện nước, lương, khấu hao thiết bị |

### 16.2. Kết cấu lãi gộp — phải tách được

```
Lãi gộp nhân công = Doanh thu nhân công − Chi phí lương thợ trực tiếp
Lãi gộp phụ tùng  = Doanh thu phụ tùng  − Giá vốn phụ tùng
Lãi gộp thuê ngoài = Doanh thu sublet   − Chi phí sublet
─────────────────────────────────────────────────
Tổng lãi gộp = Σ trên
```

> **Đây là điểm phân biệt hệ thống chuyên nghiệp:** doanh thu nhân công và doanh thu phụ tùng có **cấu trúc lợi nhuận hoàn toàn khác nhau** (nhân công thường 60–75% lãi gộp, phụ tùng 25–45%). Gộp chung sẽ không quản trị được.

### 16.3. Quy tắc nghiệp vụ

- **BR-ACC-01:** Ghi nhận doanh thu tại thời điểm hóa đơn phát hành, gắn với RO.
- **BR-ACC-02:** Giá vốn phải khóa theo thời điểm xuất kho.
- **BR-ACC-03:** Chặn tạo RO công nợ mới khi khách vượt hạn mức hoặc quá hạn thanh toán.
- **BR-ACC-04:** Chốt sổ theo kỳ — không cho sửa chứng từ kỳ đã khóa.
- **BR-ACC-05:** Mọi bút toán điều chỉnh phải có audit trail (ai, khi nào, lý do).

---

## 17. NGHIỆP VỤ 15 — NHÂN SỰ, CHẤM CÔNG VÀ NĂNG SUẤT THỢ

### 17.1. Ba chỉ số nền tảng về thợ (S1, S16)

| Chỉ số | Công thức | Ý nghĩa |
|--------|-----------|---------|
| **Productivity (Năng suất)** | Giờ có mặt được tính công / Giờ có mặt tại xưởng | Thợ có được giao việc không? (lỗi điều phối) |
| **Efficiency (Hiệu suất)** | Giờ bán (định mức) / Giờ thực tế bỏ ra | Thợ làm nhanh hay chậm hơn định mức? (tay nghề) |
| **Utilisation / Hiệu quả tổng** | Productivity × Efficiency | Bức tranh tổng thể |

Ví dụ (theo S16): thợ có mặt 8 giờ, chỉ làm việc 6 giờ → **Productivity = 75%**.

### 17.2. Hồ sơ kỹ thuật viên

- Bậc thợ, kỹ năng chuyên môn (máy / gầm / điện / đồng / sơn / điều hòa / hybrid-EV)
- Chứng chỉ và hạn hiệu lực
- Ca làm việc, ngày nghỉ
- Đơn giá giờ công nội bộ (để tính chi phí nhân công trực tiếp)

> **Phân công theo kỹ năng:** hệ thống nên gợi ý KTV phù hợp với loại công việc, không phân bừa.

### 17.3. Trả lương theo sản lượng

Nhiều gara trả lương thợ theo **giờ bán được (flat-rate pay)** hoặc lương cứng + thưởng theo sản lượng. Hệ thống cần xuất được bảng: mỗi KTV trong kỳ đã bán bao nhiêu giờ, làm bao nhiêu RO, tỷ lệ rework.

---

## 18. NGHIỆP VỤ 16 — BÁO CÁO QUẢN TRỊ VÀ KPI

### 18.1. Bộ KPI chuẩn (S16, S1)

#### A. Nhóm doanh thu

| KPI | Công thức | Chuẩn tham chiếu |
|-----|-----------|------------------|
| **Car Count** | Số xe vào xưởng trong kỳ | Theo dõi tuần |
| **ARO** (Average Repair Order) | Tổng doanh thu / Số RO | Tách **khách mới vs khách cũ** |
| **Giờ bán trung bình/RO** | Tổng giờ bán / Số RO | **Mong muốn ≥ 3 giờ/RO** |
| **Doanh thu theo dòng** | Nhân công / Phụ tùng / Sublet | |

#### B. Nhóm hiệu quả

| KPI | Công thức |
|-----|-----------|
| **Effective Labor Rate (ELR)** | Doanh thu nhân công / Giờ bán thực tế — *bao nhiêu tiền thực thu trên mỗi giờ sau chiết khấu; cần bám sát "door rate"* |
| **Technician Productivity** | Giờ được tính công / Giờ có mặt |
| **Technician Efficiency** | Giờ bán / Giờ thực làm |
| **Gross Profit per Hour** | Lãi gộp / Giờ khả dụng — *chỉ số tổng hợp mạnh nhất* |
| **Bay Utilisation** | Giờ khoang được dùng / Giờ khoang khả dụng |

#### C. Nhóm chất lượng & khách hàng

| KPI | Chuẩn |
|-----|-------|
| **Comeback / Rework Rate** | Càng thấp càng tốt — comeback cao xóa sạch hiệu suất |
| **Carry-over Rate** | **< 5%** (Toyota) |
| **Đúng hẹn giao xe (On-time delivery)** | |
| **CSI / NPS** | |
| **Tỷ lệ khách quay lại** | |
| **Tỷ lệ chuyển đổi DVI** (mục 🟡/🔴 → được duyệt) | Thước đo trực tiếp hiệu quả của SA |

#### D. Nhóm phụ tùng

| KPI |
|-----|
| Vòng quay tồn kho (Inventory Turnover) |
| Tỷ lệ đáp ứng ngay từ tồn kho (Fill rate / Off-the-shelf rate) |
| Giá trị hàng chết (dead stock) |
| Tỷ lệ core đã thu hồi |

### 18.2. Tần suất theo dõi (S16)

- **Hàng tuần:** ARO, car count, năng suất KTV
- **Hàng tháng:** tỷ suất lãi gộp, lãi ròng, ELR

### 18.3. Các báo cáo bắt buộc

1. Doanh thu theo ngày/tuần/tháng, tách nhân công — phụ tùng
2. Lãi gộp theo RO / theo dịch vụ / theo KTV
3. Bảng theo dõi xe đang trong xưởng (WIP) + tuổi WIP
4. Công nợ phải thu theo tuổi nợ (đặc biệt công nợ bảo hiểm)
5. Tồn kho & đề xuất đặt hàng
6. Năng suất & hiệu suất KTV
7. Comeback & rework
8. Deferred work chưa chuyển đổi (doanh thu tiềm năng)
9. Nguồn khách & hiệu quả chiến dịch marketing

---

## 19. NGHIỆP VỤ 17 — PHÂN QUYỀN VÀ KIỂM SOÁT NỘI BỘ

### 19.1. Ma trận phân quyền (RBAC) tối thiểu

| Chức năng | Khách | CSR | SA | KTV | Kho | QC | Kế toán | QL DV | Admin |
|-----------|:-----:|:---:|:--:|:---:|:---:|:--:|:-------:|:-----:|:-----:|
| Xem lịch hẹn của mình | ✔ | ✔ | ✔ | | | | | ✔ | ✔ |
| Tạo/sửa lịch hẹn | ✔(của mình) | ✔ | ✔ | | | | | ✔ | ✔ |
| Tiếp nhận xe, tạo RO | | | ✔ | | | | | ✔ | ✔ |
| Thực hiện DVI | | | | ✔ | | ✔ | | ✔ | ✔ |
| Lập báo giá | | | ✔ | | | | | ✔ | ✔ |
| Phê duyệt báo giá | ✔ | | | | | | | ✔* | ✔ |
| Giảm giá > ngưỡng | | | | | | | | ✔ | ✔ |
| Phân công KTV | | | ✔ | | | | | ✔ | ✔ |
| Clock on/off | | | | ✔ | | | | ✔ | ✔ |
| Xuất kho phụ tùng | | | | | ✔ | | | ✔ | ✔ |
| Tạo PO / nhập kho | | | | | ✔ | | | ✔ | ✔ |
| Ký QC | | | | | | ✔ | | ✔ | ✔ |
| Xuất hóa đơn, thu tiền | | | | | | | ✔ | ✔ | ✔ |
| Mở lại RO đã đóng | | | | | | | | ✔ | ✔ |
| Xem báo cáo tài chính | | | | | | | ✔ | ✔ | ✔ |
| Cấu hình hệ thống, phân quyền | | | | | | | | | ✔ |

\* Quản lý dịch vụ duyệt thay khách trong trường hợp khách ủy quyền qua điện thoại — phải ghi rõ kênh và người ủy quyền.

### 19.2. Nguyên tắc kiểm soát nội bộ

- **Tách biệt trách nhiệm (Segregation of Duties):** người báo giá ≠ người QC ≠ người thu tiền.
- **Audit trail bất biến** cho: thay đổi giá, giảm giá, sửa/xóa dòng RO, mở lại RO, điều chỉnh kho, hủy hóa đơn, đổi quyền người dùng.
- **Không xóa cứng chứng từ** — chỉ hủy có lý do và lưu vết.
- **Cảnh báo hành vi bất thường:** giảm giá bất thường, xuất kho không gắn RO, RO đóng mà chưa thu tiền, sửa odometer lùi.

---

## 20. TUÂN THỦ PHÁP LÝ TẠI VIỆT NAM

| Văn bản | Nội dung liên quan | Ảnh hưởng đến hệ thống |
|---------|--------------------|------------------------|
| **Nghị định 116/2017/NĐ-CP** (S2) | Điều kiện kinh doanh dịch vụ **bảo hành, bảo dưỡng ô tô**: cơ sở phải thuộc sở hữu / thuê / thuộc hệ thống đại lý ủy quyền; phải có **thiết bị chẩn đoán** phù hợp; phải có **đội ngũ nhân lực và hệ thống quản lý chất lượng** | Cần lưu hồ sơ Giấy chứng nhận cơ sở BH-BD, hồ sơ nhân sự & chứng chỉ, hồ sơ thiết bị |
| **TCVN 11794:2017** (S3) | Yêu cầu về **mặt bằng, trang thiết bị, dụng cụ, nhân lực, hệ thống quản lý chất lượng** đối với cơ sở bảo dưỡng, sửa chữa ô tô | Hệ thống nên có module quản lý thiết bị: lý lịch, lịch hiệu chuẩn/bảo trì |
| **Luật Bảo vệ quyền lợi NTD 2023 (19/2023/QH15)** — hiệu lực **01/7/2024** (S4) | Người tiêu dùng **có quyền được cung cấp hóa đơn, chứng từ, tài liệu liên quan giao dịch** và thông tin đầy đủ, chính xác về dịch vụ, nguồn gốc xuất xứ; DN phải **thường xuyên kiểm tra chất lượng dịch vụ** như đã cam kết | Bắt buộc xuất hóa đơn/chứng từ; minh bạch nguồn gốc phụ tùng; lưu cam kết bảo hành |
| **Nghị định 123/2020/NĐ-CP**, sửa đổi bởi **Nghị định 70/2025/NĐ-CP** — hiệu lực **01/6/2025** (S5) | Hóa đơn điện tử; **thời điểm lập hóa đơn** — không muộn hơn ngày làm việc tiếp theo kể từ khi phát sinh nghĩa vụ | Tích hợp HĐĐT, kiểm soát thời điểm lập, xử lý hóa đơn điều chỉnh/thay thế |
| Quy định về **an toàn lao động, PCCC, môi trường** | Xử lý dầu thải, ắc-quy thải, nước thải rửa xe | Nên có nhật ký chất thải nguy hại |
| Quy định **bảo vệ dữ liệu cá nhân** | Dữ liệu KH, biển số, hình ảnh | Cần cơ chế đồng ý nhận thông tin & quyền xóa dữ liệu |

---

## 21. STATE MACHINE VÀ MÔ HÌNH DỮ LIỆU TỐI THIỂU

### 21.1. Các thực thể cốt lõi

```
User ──< Role ──< Permission

Customer ──< VehicleOwnership >── Vehicle
Vehicle ──< OdometerLog
Vehicle ──< ServiceHistory (view của RO)

Appointment ──> Customer, Vehicle, ServiceType[], AssignedBay?, AssignedTech?
Appointment ──> RepairOrder (1-1 khi chuyển đổi)

Inspection (DVI) ──> Vehicle, RepairOrder?, Technician
Inspection ──< InspectionItem (mục, trạng thái R/Y/G, đo lường, ảnh, ghi chú)

Quote ──> Customer, Vehicle, RepairOrder?
Quote ──< QuoteLine (type: LABOR|PART|SUBLET|FEE|DISCOUNT)
Quote ──< QuoteVersion (immutable snapshot)
Quote ──< Approval (ai, lúc nào, kênh, nội dung, chữ ký)

RepairOrder ──> Customer, Vehicle, ServiceAdvisor, Appointment?, Quote?
RepairOrder ──< ROLine (jobType: CP|W|I|INS|GOODWILL)
   ROLine ──< LaborOperation ──< TimeLog(tech, start, end, pause_reason)
   ROLine ──< PartLine ──> StockIssue ──> InventoryTransaction
   ROLine ──< SubletLine ──> Supplier
RepairOrder ──< ChangeOrder ──< Approval
RepairOrder ──< StatusHistory (from, to, by, at, reason)
RepairOrder ──< Attachment (photo, video, document)
RepairOrder ──> QCRecord (inspector, at, result, checklist[], testDriveKm)
RepairOrder ──< Invoice ──< Payment
RepairOrder ──> WarrantyPolicy (months, km, from_date)
RepairOrder ──> parent_ro (nếu là comeback)

Part ──< InventoryTransaction (IN|OUT|TRANSFER|ADJUST|RETURN)
Part ──< StockLevel (per warehouse: onHand, reserved, available)
PurchaseOrder ──< POLine ──< GoodsReceiptLine
Supplier ──< SupplierInvoice ──< APPayment

InsuranceClaim ──> RepairOrder, InsuranceCompany, Surveyor
InsuranceClaim ──< ClaimDocument, Guarantee(bảo lãnh), ClaimPayment

DeferredWork ──> Vehicle, sourceInspectionItem?, sourceQuoteLine?, remindAt
Reminder ──> Customer, Vehicle, type, dueAt, status
Feedback/Survey ──> RepairOrder, score, category, complaint
AuditLog ──> entity, entityId, action, before, after, by, at
```

### 21.2. Bảng trạng thái tổng hợp

| Thực thể | Các trạng thái |
|----------|----------------|
| Appointment | DRAFT, SCHEDULED, CONFIRMED, ARRIVED, CONVERTED, RESCHEDULED, NO_SHOW, CANCELLED |
| Inspection | DRAFT, IN_PROGRESS, COMPLETED, SENT_TO_CUSTOMER |
| Quote | DRAFT, SENT, APPROVED, PARTIALLY_APPROVED, DECLINED, EXPIRED, REVISED |
| RepairOrder | CREATED, INSPECTING, ESTIMATING, AWAITING_APPROVAL, APPROVED, IN_PROGRESS, WAITING_PARTS, WAITING_CUSTOMER, ON_HOLD, WORK_COMPLETED, QC_INSPECTION, REWORK, READY_FOR_DELIVERY, INVOICED, DELIVERED, CLOSED, CANCELLED |
| ROLine | PENDING, ASSIGNED, IN_PROGRESS, PAUSED, COMPLETED, QC_PASSED, DECLINED |
| PurchaseOrder | DRAFT, SENT, PARTIALLY_RECEIVED, RECEIVED, CANCELLED |
| Invoice | DRAFT, ISSUED, PARTIALLY_PAID, PAID, ADJUSTED, CANCELLED |
| InsuranceClaim | NOTIFIED, SURVEYED, QUOTED, APPROVED, GUARANTEED, COMPLETED, SETTLED |

---

## 22. MA TRẬN RACI

**R** = Thực hiện, **A** = Chịu trách nhiệm cuối, **C** = Được hỏi ý kiến, **I** = Được thông báo

| Hoạt động | KH | CSR | SA | Điều phối | KTV | Kho | QC | Kế toán | QL DV |
|-----------|:--:|:---:|:--:|:---------:|:---:|:---:|:--:|:-------:|:-----:|
| Đặt lịch hẹn | C | R | A | I | | I | | | I |
| Tiếp nhận xe | C | | **R/A** | I | | | | | I |
| Kiểm tra & DVI | I | | A | | **R** | | C | | I |
| Lập báo giá | C | | **R/A** | | C | C | | | C |
| Phê duyệt báo giá | **A** | | R | | | | | | C |
| Phân công công việc | | | C | **R/A** | I | | | | I |
| Cấp phụ tùng | | | I | C | C | **R/A** | | | I |
| Thi công | | | I | C | **R/A** | C | | | I |
| Xử lý phát sinh | **A** | | **R** | I | C | C | | | C |
| Kiểm tra chất lượng | | | I | I | C | | **R/A** | | C |
| Xuất hóa đơn & thu tiền | C | | C | | | | | **R/A** | I |
| Bàn giao xe | **A** | | **R** | | | | | C | I |
| Follow-up sau dịch vụ | C | **R** | C | | | | | | A |
| Xử lý khiếu nại | C | R | C | | C | | C | | **A** |
| Duyệt bảo hành nội bộ | I | | C | | C | | C | I | **R/A** |

---

## 23. DANH MỤC CHỨNG TỪ BẮT BUỘC

| # | Chứng từ | Bắt buộc | Chữ ký | Nguồn yêu cầu |
|---|----------|:--------:|--------|---------------|
| 1 | Phiếu hẹn / Xác nhận lịch hẹn | Nên có | | S1 |
| 2 | **Biên bản tiếp nhận xe** (kèm sơ đồ hư hại, tài sản trên xe) | ✔ | KH + SA | S1, thực tiễn VN |
| 3 | **Báo cáo kiểm tra (DVI/MPI)** | ✔ | KTV | S8, S9 |
| 4 | **Báo giá** | ✔ | KH duyệt | **S6 (pháp lý)**, S11 |
| 5 | **Phiếu phê duyệt phát sinh (Change Order)** | ✔ | KH duyệt + ghi ngày giờ, người duyệt, kênh liên hệ | **S6 (pháp lý)** |
| 6 | **Lệnh sửa chữa (RO)** — có số hiệu tuần tự | ✔ | SA + KH | **S1** |
| 7 | Phiếu xuất kho phụ tùng | ✔ | Kho + KTV | Kiểm soát nội bộ |
| 8 | Đơn đặt hàng NCC (PO) / Phiếu nhập kho (GRN) | ✔ | Kho + NCC | Kiểm soát nội bộ |
| 9 | **Phiếu kiểm tra chất lượng (QC)** | ✔ | KCS/Tổ trưởng | **S1**, S10 |
| 10 | **Hóa đơn / Quyết toán** (ghi rõ phụ tùng mới/cũ/tái chế, tách nhân công) | ✔ | | **S4, S5, S6** |
| 11 | Phiếu thu / Chứng từ thanh toán | ✔ | Thủ quỹ | |
| 12 | **Phiếu bảo hành dịch vụ** | ✔ | Gara | S4 |
| 13 | Biên bản nghiệm thu & bàn giao xe | ✔ | KH + SA | S13 |
| 14 | Biên bản giám định bảo hiểm / Bảo lãnh thanh toán | ✔ (xe BH) | Giám định viên | **S13, S14** |
| 15 | Phiếu khảo sát / Nhật ký follow-up | Nên có | CSR | **S1** |

---

## 24. CHECKLIST MỨC ĐỘ TRƯỞNG THÀNH (MATURITY)

Dùng để tự chấm điểm hệ thống.

### Mức 1 — Cơ bản (Sổ sách số hóa)
- [ ] Quản lý khách hàng, xe, lịch sử dịch vụ
- [ ] Đặt lịch hẹn đơn giản
- [ ] Tạo RO và ghi hạng mục công việc
- [ ] Báo giá và in ra
- [ ] Hóa đơn và thu tiền
- [ ] Danh mục dịch vụ, phụ tùng có giá

### Mức 2 — Kiểm soát quy trình
- [ ] State machine RO đầy đủ, có trạng thái ngoại lệ (chờ phụ tùng / chờ khách)
- [ ] Phê duyệt báo giá có lưu vết (ai, lúc nào, kênh)
- [ ] **Change Order (phê duyệt phát sinh)** đầy đủ theo chuẩn pháp lý
- [ ] Phân công KTV, clock on/off
- [ ] QC gate bắt buộc trước bàn giao, người QC ≠ người làm
- [ ] Xuất kho gắn RO, trừ tồn thực
- [ ] Phân quyền theo vai trò
- [ ] Audit log các thao tác nhạy cảm

### Mức 3 — Tối ưu vận hành
- [ ] DVI có ảnh/video, 3 màu, gửi khách
- [ ] Deferred Work + Reminder engine
- [ ] Hoạch định năng lực (time bucket, bay, kỹ năng KTV)
- [ ] Mua hàng: PR → PO → GRN → đối chiếu 3 chiều, backorder
- [ ] Min-Max, đề xuất đặt hàng tự động
- [ ] Định mức giờ công (flat rate) theo dịch vụ + model
- [ ] Lãi gộp tách nhân công / phụ tùng / sublet
- [ ] KPI: ELR, Productivity, Efficiency, ARO, Comeback rate, Carry-over

### Mức 4 — Chuyên nghiệp / Doanh nghiệp
- [ ] Nghiệp vụ bảo hiểm ba bên đầy đủ (giám định, bảo lãnh, chia chi phí, công nợ BH)
- [ ] Bảo hành nhiều lớp (hãng / gara / NCC), claim và thu hồi credit
- [ ] Core charge tracking
- [ ] Hóa đơn điện tử tích hợp CQT
- [ ] Cổng/App khách hàng: xem tiến độ, duyệt báo giá online, xem DVI
- [ ] Đa chi nhánh, đa kho
- [ ] CSI/NPS, quản lý khiếu nại có SLA
- [ ] Báo cáo BI, dự báo doanh thu, phân tích cohort khách hàng

---

## PHỤ LỤC A — 20 LỖI NGHIỆP VỤ PHỔ BIẾN NHẤT TRONG PHẦN MỀM QUẢN LÝ GARA

Đây là danh sách các sai sót thường gặp, dùng làm tiêu chí rà soát:

| # | Lỗi | Hậu quả |
|---|-----|---------|
| 1 | Không có nghiệp vụ **Change Order** — phát sinh sửa thẳng vào báo giá cũ | Vi phạm pháp lý, tranh chấp với khách |
| 2 | Báo giá không có versioning, bản đã duyệt bị ghi đè | Mất bằng chứng phê duyệt |
| 3 | Không có trạng thái `WAITING_PARTS` / `WAITING_CUSTOMER` riêng | Không phân tích được nguyên nhân xe tồn; hiệu suất KTV bị tính sai |
| 4 | Không có QC gate, hoặc cho phép người làm tự QC | Comeback cao |
| 5 | Xuất kho không gắn RO / không trừ tồn thực | Thất thoát kho |
| 6 | Không đóng băng giá vốn lúc xuất kho | Báo cáo lãi gộp quá khứ sai |
| 7 | Không tách doanh thu nhân công vs phụ tùng | Không quản trị được lợi nhuận |
| 8 | Xe gắn cứng vào một khách hàng, không xử lý đổi chủ | Sai lịch sử |
| 9 | Dùng biển số làm khóa thay VIN | Trùng/nhầm xe |
| 10 | Không lưu lịch sử odometer | Không tính được chu kỳ bảo dưỡng |
| 11 | Không có Deferred Work | Mất nguồn doanh thu lớn nhất |
| 12 | Không có time log (clock on/off) | Không tính được năng suất, hiệu suất |
| 13 | Dùng giờ khai của thợ để tính tiền khách thay vì định mức | Doanh thu không nhất quán |
| 14 | Không có state history / audit log | Không truy trách nhiệm được |
| 15 | Hóa đơn sinh được từ RO chưa QC / chưa duyệt | Rủi ro tài chính |
| 16 | Không hỗ trợ nhiều job type trên một RO (split-pay) | Không làm được xe bảo hành + bảo hiểm |
| 17 | Không có giữ chỗ (reservation) phụ tùng | Tranh chấp phụ tùng giữa các RO |
| 18 | Xóa cứng dữ liệu | Mất lịch sử, không audit được |
| 19 | Không có công nợ & tuổi nợ (nhất là với bảo hiểm) | Mất dòng tiền |
| 20 | Không có phân quyền chi tiết, tất cả dùng chung quyền admin | Rủi ro gian lận nội bộ |

---

## PHỤ LỤC B — TỪ ĐIỂN THUẬT NGỮ

| Thuật ngữ | Tiếng Việt | Giải thích |
|-----------|------------|------------|
| RO — Repair Order | Lệnh sửa chữa | Chứng từ trung tâm của một lần dịch vụ |
| SA — Service Advisor | Cố vấn dịch vụ | Người sở hữu quan hệ với khách trong suốt RO |
| DVI / MPI | Kiểm tra xe số hóa / đa điểm | Checklist có ảnh, phân loại 3 màu |
| Estimate / Quote | Báo giá | Dự toán chi phí trước khi làm |
| Change Order | Phê duyệt phát sinh | Báo giá bổ sung cần khách duyệt lại |
| Deferred Work | Hạng mục hoãn lại | Khuyến nghị khách chưa làm lần này |
| Comeback | Xe quay lại | Khách quay lại vì lỗi chưa xử lý triệt để |
| Carry-over | Xe tồn | Xe qua đêm ngoài kế hoạch |
| Flat Rate | Định mức giờ công | Giờ chuẩn cho một thao tác |
| ELR — Effective Labor Rate | Đơn giá giờ công thực thu | Doanh thu nhân công / giờ bán |
| ARO — Average Repair Order | Giá trị RO trung bình | Doanh thu / số RO |
| Core Charge | Tiền cọc vỏ cũ | Cọc thu khi bán phụ tùng tái chế |
| Sublet | Thuê ngoài | Công việc gửi ra ngoài làm |
| Bay | Khoang sửa chữa | Vị trí làm việc vật lý |
| Heijunka | San bằng khối lượng | Kỹ thuật cân bằng tải xưởng của Toyota |
| 3C | Complaint / Cause / Correction | Chuẩn ghi chép của KTV |
| Deductible | Mức miễn thường | Phần khách tự chịu trong bảo hiểm |

---

## NGUỒN THAM KHẢO ĐẦY ĐỦ

1. Toyota — *7 Steps of Service Operation*: https://archive.org/stream/Toyota7StepsServiceOperation/Toyota-7-Steps-Service-Operation_djvu.txt
2. Chính phủ Việt Nam — *Nghị định 116/2017/NĐ-CP*: https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=191464
3. *TCVN 11794:2017 với cơ sở bảo hành, bảo dưỡng ô tô*: https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/thong-bao-van-ban-moi/email/18112/ap-dung-tcvn-11794-2017-voi-co-so-bao-hanh-bao-duong-o-to
4. Quốc hội — *Luật Bảo vệ quyền lợi người tiêu dùng 2023 (19/2023/QH15)*: https://thuvienphapluat.vn/van-ban/Thuong-mai/Luat-Bao-ve-quyen-loi-nguoi-tieu-dung-2023-19-2023-QH15-500102.aspx
5. Báo Chính phủ — *Những nội dung mới của Nghị định 70/2025/NĐ-CP về hóa đơn, chứng từ*: https://baochinhphu.vn/nhung-noi-dung-moi-cua-nghi-dinh-so-70-2025-nd-cp-ve-hoa-don-chung-tu-102250903091616929.htm
6. California Bureau of Automotive Repair — *Automotive Repair Transactions / Write It Right*: https://www.bar.ca.gov/pdf/workshops/202301-automotive-repair-transactions/presentation.pdf
7. MySyara — *The Auto Repair Shop Workflow, End to End (2026 Guide)*: https://os.mysyara.com/blog/auto-repair-shop-workflow
8. Tekmetric — *Streamline Your Auto Repair Shop Workflow*: https://www.tekmetric.com/post/repair-tracking-software-workflow
9. AutoVitals — *Digital Vehicle Inspection Best Practices*: https://blog.autovitals.com/digital-vehicle-inspection-best-practices
10. Autobody News — *Quality Control in 6 Easy Steps*: https://www.autobodynews.com/index.php/dave-luehr/item/11676-quality-control-in-6-easy-steps.html
11. VATC — *Quy trình tiếp nhận sửa chữa ô tô chuẩn tại gara*: https://oto.edu.vn/quy-trinh-tiep-nhan-sua-chua-o-to/
12. VC Garage — *7 bước chuẩn trong quy trình sửa chữa xe ô tô*: https://vcgarage.com/quy-trinh-sua-chua-xe-o-to/
13. Bảo hiểm Bảo Việt — *Quy trình bồi thường bảo hiểm xe cơ giới*: https://ibaoviet.vn/quy-trinh-boi-thuong-bao-hiem-xe-co-gioi/
14. VinFast — *Bồi thường bảo hiểm xe ô tô: Quy trình giám định và xử lý*: https://vinfastauto.com/vn_vi/quy-trinh-giam-dinh-boi-thuong-bao-hiem-xe-o-to
15. Optimum — *Automotive Parts Inventory Management*: https://www.optimumhq.com/blog/automotive-parts-inventory-management
16. KaizenCPAs — *6 KPIs Every Auto Repair Shop Owner Should Track*: https://www.kaizencpas.com/auto/repair-shop-kpis-profitability

---

*Hết tài liệu. Phiên bản 1.0 — 23/07/2026.*
