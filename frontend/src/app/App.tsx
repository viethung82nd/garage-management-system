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
      <Route path="*" element={<Navigate to="/my-account" replace />} />
    </Routes>
  )
}
