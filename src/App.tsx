import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { InternalLayout, PortalLayout, PublicLayout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

// Public
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'

// Internal (staff/admin)
import { Dashboard } from '@/pages/Dashboard'
import { CalendarPage } from '@/pages/CalendarPage'
import { FilesPage } from '@/pages/FilesPage'
import { BookingsPage } from '@/pages/bookings/BookingsPage'
import { BookingRequests } from '@/pages/bookings/BookingRequests'
import { BookingDetail } from '@/pages/bookings/BookingDetail'
import { NewBooking } from '@/pages/bookings/NewBooking'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetail } from '@/pages/clients/ClientDetail'
import { InviteClient } from '@/pages/clients/InviteClient'
import { ResourcesPage } from '@/pages/resources/ResourcesPage'
import { ResourceDetail } from '@/pages/resources/ResourceDetail'
import { NewResource } from '@/pages/resources/NewResource'
import { InvoicesPage } from '@/pages/invoices/InvoicesPage'
import { InvoiceDetail } from '@/pages/invoices/InvoiceDetail'
import { NewInvoice } from '@/pages/invoices/NewInvoice'

// Client portal
import { PortalDashboard } from '@/pages/portal/PortalDashboard'
import { PortalBookings } from '@/pages/portal/PortalBookings'
import { PortalBookingRequest } from '@/pages/portal/PortalBookingRequest'
import { PortalBookingDetail } from '@/pages/portal/PortalBookingDetail'
import { PortalInvoices } from '@/pages/portal/PortalInvoices'
import { PortalInvoiceDetail } from '@/pages/portal/PortalInvoiceDetail'
import { PortalFiles } from '@/pages/portal/PortalFiles'
import { PortalMessages } from '@/pages/portal/PortalMessages'
import { PortalProfile } from '@/pages/portal/PortalProfile'

function StaffRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRoles={['admin', 'staff']}>{children}</ProtectedRoute>
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRoles={['client']}>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
          </Route>

          {/* Internal staff/admin routes */}
          <Route element={<InternalLayout />}>
            <Route path="/dashboard" element={<StaffRoute><Dashboard /></StaffRoute>} />
            <Route path="/calendar" element={<StaffRoute><CalendarPage /></StaffRoute>} />

            <Route path="/bookings" element={<StaffRoute><BookingsPage /></StaffRoute>} />
            <Route path="/bookings/requests" element={<StaffRoute><BookingRequests /></StaffRoute>} />
            <Route path="/bookings/new" element={<StaffRoute><NewBooking /></StaffRoute>} />
            <Route path="/bookings/:id" element={<StaffRoute><BookingDetail /></StaffRoute>} />

            <Route path="/clients" element={<StaffRoute><ClientsPage /></StaffRoute>} />
            <Route path="/clients/invite" element={<StaffRoute><InviteClient /></StaffRoute>} />
            <Route path="/clients/:id" element={<StaffRoute><ClientDetail /></StaffRoute>} />

            <Route path="/resources" element={<StaffRoute><ResourcesPage /></StaffRoute>} />
            <Route path="/resources/new" element={<StaffRoute><NewResource /></StaffRoute>} />
            <Route path="/resources/:type/:id" element={<StaffRoute><ResourceDetail /></StaffRoute>} />

            <Route path="/invoices" element={<StaffRoute><InvoicesPage /></StaffRoute>} />
            <Route path="/invoices/new" element={<StaffRoute><NewInvoice /></StaffRoute>} />
            <Route path="/invoices/:id" element={<StaffRoute><InvoiceDetail /></StaffRoute>} />

            <Route path="/files" element={<StaffRoute><FilesPage /></StaffRoute>} />
          </Route>

          {/* Client portal routes */}
          <Route element={<PortalLayout />}>
            <Route path="/portal" element={<ClientRoute><PortalDashboard /></ClientRoute>} />
            <Route path="/portal/bookings" element={<ClientRoute><PortalBookings /></ClientRoute>} />
            <Route path="/portal/bookings/request" element={<ClientRoute><PortalBookingRequest /></ClientRoute>} />
            <Route path="/portal/bookings/:id" element={<ClientRoute><PortalBookingDetail /></ClientRoute>} />
            <Route path="/portal/invoices" element={<ClientRoute><PortalInvoices /></ClientRoute>} />
            <Route path="/portal/invoices/:id" element={<ClientRoute><PortalInvoiceDetail /></ClientRoute>} />
            <Route path="/portal/files" element={<ClientRoute><PortalFiles /></ClientRoute>} />
            <Route path="/portal/messages" element={<ClientRoute><PortalMessages /></ClientRoute>} />
            <Route path="/portal/profile" element={<ClientRoute><PortalProfile /></ClientRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
