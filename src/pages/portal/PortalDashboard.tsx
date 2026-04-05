import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Booking, Invoice, FileRecord, Message } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  confirmed: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

export function PortalDashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [fileCount, setFileCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function load() {
      const [bookingsRes, invoicesRes, filesRes, messagesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*')
          .eq('client_id', user!.id)
          .in('status', ['requested', 'confirmed'])
          .order('start_time')
          .limit(5),
        supabase
          .from('invoices')
          .select('*')
          .eq('client_id', user!.id)
          .in('status', ['sent', 'overdue'])
          .order('due_date')
          .limit(5),
        supabase
          .from('files')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', user!.id),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', user!.id)
          .eq('is_internal', false),
      ])

      setBookings(bookingsRes.data ?? [])
      setInvoices(invoicesRes.data ?? [])
      setFileCount(filesRes.count ?? 0)
      setMessageCount(messagesRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Welcome back</h1>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{bookings.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{invoices.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Shared Files</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{fileCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{messageCount}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/portal/bookings/request">Request Booking</Link>
            </Button>
          </div>
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <Link key={b.id} to={`/portal/bookings/${b.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {new Date(b.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant={statusColors[b.status]}>{b.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Invoices Due</h2>
            <Button asChild variant="outline" size="sm">
              <Link to="/portal/invoices">View All</Link>
            </Button>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding invoices.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <Link key={inv.id} to={`/portal/invoices/${inv.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <p className="font-medium">${inv.total.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
