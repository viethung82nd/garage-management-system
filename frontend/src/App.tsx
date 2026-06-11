import { Navigate, Route, Routes } from 'react-router-dom'
import { BookingRequestsPage } from './pages/advisor/BookingRequestsPage'
import { VehicleReceptionPage } from './pages/advisor/VehicleReceptionPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/advisor/bookings" />} path="/" />

      <Route element={<BookingRequestsPage />} path="/advisor/bookings" />
      <Route element={<VehicleReceptionPage />} path="/advisor/reception" />
      <Route element={<PlaceholderPage title="Lệnh sửa chữa" />} path="/advisor/work-orders" />
      <Route element={<PlaceholderPage title="Khách hàng" />} path="/advisor/customers" />
      <Route element={<PlaceholderPage title="Xe" />} path="/advisor/vehicles" />

      <Route element={<PlaceholderPage title="Khách hàng - Tổng quan" />} path="/customer/dashboard" />
      <Route element={<PlaceholderPage title="Lịch hẹn của tôi" />} path="/customer/appointments" />
      <Route element={<PlaceholderPage title="Xe của tôi" />} path="/customer/vehicles" />
      <Route element={<PlaceholderPage title="Theo dõi sửa chữa" />} path="/customer/repairs" />
      <Route element={<PlaceholderPage title="Hóa đơn của tôi" />} path="/customer/invoices" />

      <Route element={<PlaceholderPage title="Kỹ thuật viên - Công việc" />} path="/technician/tasks" />
      <Route element={<PlaceholderPage title="Lệnh sửa chữa được giao" />} path="/technician/work-orders" />
      <Route element={<PlaceholderPage title="Yêu cầu phụ tùng" />} path="/technician/parts-requests" />

      <Route element={<PlaceholderPage title="Kế toán - Tổng quan" />} path="/accountant/dashboard" />
      <Route element={<PlaceholderPage title="Hóa đơn" />} path="/accountant/invoices" />
      <Route element={<PlaceholderPage title="Thanh toán" />} path="/accountant/payments" />
      <Route element={<PlaceholderPage title="Báo cáo tài chính" />} path="/accountant/reports" />

      <Route element={<PlaceholderPage title="Quản trị - Tổng quan" />} path="/admin/dashboard" />
      <Route element={<PlaceholderPage title="Người dùng" />} path="/admin/users" />
      <Route element={<PlaceholderPage title="Phân quyền" />} path="/admin/roles" />
      <Route element={<PlaceholderPage title="Dịch vụ" />} path="/admin/services" />
      <Route element={<PlaceholderPage title="Phụ tùng" />} path="/admin/parts" />
      <Route element={<PlaceholderPage title="Báo cáo hệ thống" />} path="/admin/reports" />

      <Route element={<PlaceholderPage title="Không tìm thấy trang" />} path="*" />
    </Routes>
  )
}
