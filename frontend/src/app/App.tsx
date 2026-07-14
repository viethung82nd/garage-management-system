import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppointmentPage } from '../pages/appointment'
import { LostPasswordPage, MyAccountPage, ResetPasswordPage } from '../pages/auth'
import { ContactUsPage } from '../pages/contact-us'
import { HomeFivePage } from '../pages/home-five'
import { OurBrandsPage } from '../pages/our-brands'
import { RequireAuth, RequireRole } from './route-guards'
import { theme } from '../shared/config/theme'

const AdminDashboardPage = lazy(() => import('../pages/admin/dashboard').then((module) => ({ default: module.AdminDashboardPage })))
const InvoiceManagementPage = lazy(() => import('../pages/accountant/invoices').then((module) => ({ default: module.InvoiceManagementPage })))
const InvoiceConfirmPage = lazy(() => import('../pages/accountant/confirm').then((module) => ({ default: module.InvoiceConfirmPage })))
const CustomerProfilePage = lazy(() => import('../pages/customer/profile').then((module) => ({ default: module.CustomerProfilePage })))
const CustomerBookingsPage = lazy(() => import('../pages/customer/bookings').then((module) => ({ default: module.CustomerBookingsPage })))
const CustomerInvoicesPage = lazy(() => import('../pages/customer/invoices').then((module) => ({ default: module.CustomerInvoicesPage })))
const CustomerTrackingPage = lazy(() => import('../pages/customer/tracking').then((module) => ({ default: module.CustomerTrackingPage })))
const CustomerReviewsPage = lazy(() => import('../pages/customer/reviews').then((module) => ({ default: module.CustomerReviewsPage })))
const ServicesPage = lazy(() => import('../pages/services').then((module) => ({ default: module.ServicesPage })))
const AdminUsersPage = lazy(() => import('../pages/admin/users').then((module) => ({ default: module.AdminUsersPage })))
const AdminServicesPage = lazy(() => import('../pages/admin/services').then((module) => ({ default: module.AdminServicesPage })))
const AdminPartsPage = lazy(() => import('../pages/admin/parts').then((module) => ({ default: module.AdminPartsPage })))
const AdminConfigPage = lazy(() => import('../pages/admin/config').then((module) => ({ default: module.AdminConfigPage })))
const AdminReportsPage = lazy(() => import('../pages/admin/reports').then((module) => ({ default: module.AdminReportsPage })))
const ServiceAdvisorDashboardPage = lazy(() =>
  import('../pages/advisor/ServiceAdvisorDashboardPage').then((module) => ({ default: module.ServiceAdvisorDashboardPage })),
)
const BookingRequestsPage = lazy(() =>
  import('../pages/advisor/BookingRequestsPage').then((module) => ({ default: module.BookingRequestsPage })),
)
const VehicleReceptionPage = lazy(() =>
  import('../pages/advisor/VehicleReceptionPage').then((module) => ({ default: module.VehicleReceptionPage })),
)
const RepairOrderAssignmentPage = lazy(() =>
  import('../pages/advisor/RepairOrderAssignmentPage').then((module) => ({ default: module.RepairOrderAssignmentPage })),
)
const QuotationPage = lazy(() => import('../pages/advisor/QuotationPage').then((module) => ({ default: module.QuotationPage })))
const AdditionalServiceSuggestionPage = lazy(() =>
  import('../pages/advisor/AdditionalServiceSuggestionPage').then((module) => ({ default: module.AdditionalServiceSuggestionPage })),
)
const QualityVerificationPage = lazy(() =>
  import('../pages/advisor/QualityVerificationPage').then((module) => ({ default: module.QualityVerificationPage })),
)
const RepairProgressTimelinePage = lazy(() =>
  import('../pages/advisor/RepairProgressTimelinePage').then((module) => ({ default: module.RepairProgressTimelinePage })),
)
const VehicleInspectionPage = lazy(() =>
  import('../pages/advisor/VehicleInspectionPage').then((module) => ({ default: module.VehicleInspectionPage })),
)
const TechnicianWorkOrdersPage = lazy(() =>
  import('../pages/technician/TechnicianWorkOrdersPage').then((module) => ({ default: module.TechnicianWorkOrdersPage })),
)
const TechnicianRepairNotesPage = lazy(() =>
  import('../pages/technician/TechnicianRepairNotesPage').then((module) => ({ default: module.TechnicianRepairNotesPage })),
)

function RouteFallback() {
  return <div className="min-h-screen" style={{ background: theme.color.surfaceStrong, color: theme.color.onPrimary }} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeFivePage />} />
      <Route path="/home-five" element={<HomeFivePage />} />
      <Route path="/contact-us" element={<ContactUsPage />} />
      <Route path="/appointment" element={<AppointmentPage />} />
      <Route path="/our-brands" element={<OurBrandsPage />} />
      <Route path="/my-account" element={<MyAccountPage />} />
      <Route path="/my-account/lost-password" element={<LostPasswordPage />} />
      <Route path="/my-account/reset-password" element={<ResetPasswordPage />} />
      <Route path="/customer/login" element={<MyAccountPage />} />
      <Route path="/customer/forgot-password" element={<LostPasswordPage />} />
      <Route
        path="/customer/profile"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['onlineCustomer']}>
                <CustomerProfilePage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/customer/bookings"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['onlineCustomer']}>
                <CustomerBookingsPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/customer/invoices"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['onlineCustomer']}>
                <CustomerInvoicesPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/customer/reviews"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['onlineCustomer']}>
                <CustomerReviewsPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/tracking"
        element={
          <Suspense fallback={<RouteFallback />}>
            <CustomerTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/services"
        element={
          <Suspense fallback={<RouteFallback />}>
            <ServicesPage />
          </Suspense>
        }
      />
      <Route path="/customer/tracking" element={<Navigate to="/tracking" replace />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/accountant" element={<Navigate to="/accountant/invoices" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminDashboardPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/admin/users"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminUsersPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/admin/services"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminServicesPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/admin/parts"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminPartsPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminReportsPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/admin/config"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['admin']}>
                <AdminConfigPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/accountant/invoices"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['accountant']}>
                <InvoiceManagementPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/accountant/invoices/confirm"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['accountant']}>
                <InvoiceConfirmPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route path="/admin/login" element={<MyAccountPage />} />
      <Route path="/admin/forgot-password" element={<LostPasswordPage />} />

      <Route path="/advisor" element={<Navigate to="/advisor/dashboard" replace />} />
      <Route
        path="/advisor/dashboard"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <ServiceAdvisorDashboardPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/bookings"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <BookingRequestsPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/reception"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <VehicleReceptionPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/work-orders"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <RepairOrderAssignmentPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/quotation"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <QuotationPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/additional-services"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <AdditionalServiceSuggestionPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/quality-check"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <QualityVerificationPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/repair-timeline"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <RepairProgressTimelinePage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/advisor/inspection"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['serviceAdvisor']}>
                <VehicleInspectionPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route path="/technician" element={<Navigate to="/technician/work-orders" replace />} />
      <Route
        path="/technician/work-orders"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['technician']}>
                <TechnicianWorkOrdersPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />
      <Route
        path="/technician/repair-notes"
        element={
          <Suspense fallback={<RouteFallback />}>
            <RequireAuth>
              <RequireRole roles={['technician']}>
                <TechnicianRepairNotesPage />
              </RequireRole>
            </RequireAuth>
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/my-account" replace />} />
    </Routes>
  )
}
