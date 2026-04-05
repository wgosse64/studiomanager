import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  todaysBookings: number
  pendingRequests: number
  unpaidInvoices: number
  activeClients: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysBookings: 0,
    pendingRequests: 0,
    unpaidInvoices: 0,
    activeClients: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const today = new Date().toISOString().split('T')[0]

      const [bookingsRes, requestsRes, invoicesRes, clientsRes] =
        await Promise.all([
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('date', today)
            .in('status', ['confirmed', 'tentative']),
          supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'unpaid'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'client'),
        ])

      setStats({
        todaysBookings: bookingsRes.count ?? 0,
        pendingRequests: requestsRes.count ?? 0,
        unpaidInvoices: invoicesRes.count ?? 0,
        activeClients: clientsRes.count ?? 0,
      })
      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  const statCards = [
    { label: "Today's Bookings", value: stats.todaysBookings },
    { label: 'Pending Requests', value: stats.pendingRequests },
    { label: 'Unpaid Invoices', value: stats.unpaidInvoices },
    { label: 'Active Clients', value: stats.activeClients },
  ]

  const quickActions = [
    { label: 'New Booking', to: '/bookings/new' },
    { label: 'Booking Requests', to: '/bookings/requests' },
    { label: 'Clients', to: '/clients' },
    { label: 'Calendar', to: '/calendar' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Button key={action.to} variant="outline" asChild>
              <Link to={action.to}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
