import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminDashboardPage } from '../pages/admin/DashboardPage'
import { ServiceCatalogPage } from '../pages/admin/ServiceCatalogPage'
import { AdditionalServiceSuggestionPage } from '../pages/advisor/AdditionalServiceSuggestionPage'
import { BookingRequestsPage } from '../pages/advisor/BookingRequestsPage'
import { RepairOrderAssignmentPage } from '../pages/advisor/RepairOrderAssignmentPage'
import { RepairProgressTimelinePage } from '../pages/advisor/RepairProgressTimelinePage'
import { QualityVerificationPage } from '../pages/advisor/QualityVerificationPage'
import { QuotationPage } from '../pages/advisor/QuotationPage'
import { ServiceAdvisorDashboardPage } from '../pages/advisor/ServiceAdvisorDashboardPage'
import { TechnicianScheduleCoordinationPage } from '../pages/advisor/TechnicianScheduleCoordinationPage'
import { VehicleReceptionPage } from '../pages/advisor/VehicleReceptionPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { TechnicianInspectionPage } from '../pages/technician/TechnicianInspectionPage'
import { VehicleInspectionFormPage } from '../pages/technician/VehicleInspectionFormPage'
import { TechnicianRepairNotesPage } from '../pages/technician/TechnicianRepairNotesPage'
import { TechnicianWorkOrdersPage } from '../pages/technician/TechnicianWorkOrdersPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/advisor/dashboard" />} path="/" />

      <Route element={<ServiceAdvisorDashboardPage />} path="/advisor/dashboard" />
      <Route element={<BookingRequestsPage />} path="/advisor/bookings" />
      <Route element={<VehicleReceptionPage />} path="/advisor/reception" />
      <Route element={<RepairOrderAssignmentPage />} path="/advisor/work-orders" />
      <Route element={<QuotationPage />} path="/advisor/quotation" />
      <Route element={<AdditionalServiceSuggestionPage />} path="/advisor/additional-services" />
      <Route element={<QualityVerificationPage />} path="/advisor/quality-check" />
      <Route element={<RepairProgressTimelinePage />} path="/advisor/repair-timeline" />
      <Route element={<TechnicianScheduleCoordinationPage />} path="/advisor/technician-schedule" />
      <Route element={<PlaceholderPage title="Khách hàng" />} path="/advisor/customers" />
      <Route element={<PlaceholderPage title="Xe" />} path="/advisor/vehicles" />

      <Route element={<PlaceholderPage title="Khách hàng - Tổng quan" />} path="/customer/dashboard" />
      <Route element={<PlaceholderPage title="Lịch hẹn của tôi" />} path="/customer/appointments" />
      <Route element={<PlaceholderPage title="Xe của tôi" />} path="/customer/vehicles" />
      <Route element={<PlaceholderPage title="Theo dõi sửa chữa" />} path="/customer/repairs" />
      <Route element={<PlaceholderPage title="Hóa đơn của tôi" />} path="/customer/invoices" />

      <Route element={<TechnicianInspectionPage />} path="/technician/tasks" />
      <Route element={<VehicleInspectionFormPage />} path="/technician/inspection" />
      <Route element={<TechnicianWorkOrdersPage />} path="/technician/work-orders" />
      <Route element={<TechnicianRepairNotesPage />} path="/technician/repair-notes" />
      <Route element={<PlaceholderPage title="Kế toán - Tổng quan" />} path="/accountant/dashboard" />
      <Route element={<PlaceholderPage title="Hóa đơn" />} path="/accountant/invoices" />
      <Route element={<PlaceholderPage title="Thanh toán" />} path="/accountant/payments" />
      <Route element={<PlaceholderPage title="Báo cáo tài chính" />} path="/accountant/reports" />

      <Route element={<AdminDashboardPage />} path="/admin/dashboard" />
      <Route element={<PlaceholderPage title="Người dùng" />} path="/admin/users" />
      <Route element={<PlaceholderPage title="Phân quyền" />} path="/admin/roles" />
      <Route element={<ServiceCatalogPage />} path="/admin/services" />
      <Route element={<PlaceholderPage title="Phụ tùng" />} path="/admin/parts" />
      <Route element={<PlaceholderPage title="Báo cáo hệ thống" />} path="/admin/reports" />

      <Route element={<PlaceholderPage title="Không tìm thấy trang" />} path="*" />
    </Routes>
  )
}
