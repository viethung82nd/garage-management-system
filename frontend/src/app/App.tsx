import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LostPasswordPage, MyAccountPage } from '../pages/auth'
import { ContactUsPage } from '../pages/contact-us'
import { HomeFivePage } from '../pages/home-five'
import { theme } from '../shared/config/theme'

const AdminDashboardPage = lazy(() => import('../pages/admin/dashboard').then((module) => ({ default: module.AdminDashboardPage })))
const InvoiceManagementPage = lazy(() => import('../pages/accountant/invoices').then((module) => ({ default: module.InvoiceManagementPage })))
const InvoiceConfirmPage = lazy(() => import('../pages/accountant/confirm').then((module) => ({ default: module.InvoiceConfirmPage })))
const CustomerTrackingPage = lazy(() => import('../pages/customer/tracking').then((module) => ({ default: module.CustomerTrackingPage })))

function RouteFallback() {
  return <div className="min-h-screen" style={{ background: theme.color.surfaceStrong, color: theme.color.onPrimary }} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeFivePage />} />
      <Route path="/home-five" element={<HomeFivePage />} />
      <Route path="/contact-us" element={<ContactUsPage />} />
      <Route path="/my-account" element={<MyAccountPage />} />
      <Route path="/my-account/lost-password" element={<LostPasswordPage />} />
      <Route path="/customer/login" element={<MyAccountPage />} />
      <Route path="/customer/forgot-password" element={<LostPasswordPage />} />
      <Route
        path="/customer/tracking"
        element={
          <Suspense fallback={<RouteFallback />}>
            <CustomerTrackingPage />
          </Suspense>
        }
      />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/accountant" element={<Navigate to="/accountant/invoices" replace />} />
      <Route
        path="/admin/dashboard"
        element={
          <Suspense fallback={<RouteFallback />}>
            <AdminDashboardPage />
          </Suspense>
        }
      />
      <Route
        path="/accountant/invoices"
        element={
          <Suspense fallback={<RouteFallback />}>
            <InvoiceManagementPage />
          </Suspense>
        }
      />
      <Route
        path="/accountant/invoices/confirm"
        element={
          <Suspense fallback={<RouteFallback />}>
            <InvoiceConfirmPage />
          </Suspense>
        }
      />
      <Route path="/admin/login" element={<MyAccountPage />} />
      <Route path="/admin/forgot-password" element={<LostPasswordPage />} />
      <Route path="*" element={<Navigate to="/my-account" replace />} />
    </Routes>
  )
}
