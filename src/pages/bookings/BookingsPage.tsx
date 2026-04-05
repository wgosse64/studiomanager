import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Booking, BookingStatus, Profile, Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const statusVariant: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  confirmed: 'default',
  cancelled: 'destructive',
  completed: 'secondary',
}

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [studioFilter, setStudioFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')

  // Options for filter dropdowns
  const [studios, setStudios] = useState<Resource[]>([])
  const [clients, setClients] = useState<Profile[]>([])

  useEffect(() => {
    async function load() {
      const [bookingsRes, studiosRes, clientsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, client:profiles!client_id(*), booking_resources(*, resource:resources(*))')
          .order('start_time', { ascending: false }),
        supabase
          .from('resources')
          .select('*')
          .eq('resource_type', 'studio')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'client')
          .order('first_name'),
      ])

      setBookings(bookingsRes.data ?? [])
      setStudios(studiosRes.data ?? [])
      setClients(clientsRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (clientFilter !== 'all' && b.client_id !== clientFilter) return false
    if (studioFilter !== 'all') {
      const hasStudio = b.booking_resources?.some(
        (br) => br.resource?.resource_type === 'studio' && br.resource_id === studioFilter
      )
      if (!hasStudio) return false
    }
    return true
  })

  function getStudioName(booking: Booking): string {
    const studio = booking.booking_resources?.find(
      (br) => br.resource?.resource_type === 'studio'
    )
    return studio?.resource?.name ?? 'No studio'
  }

  function formatTimeRange(start: string, end: string): string {
    const s = new Date(start)
    const e = new Date(end)
    return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading bookings...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button asChild>
          <Link to="/bookings/new">New Booking</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Studio</Label>
          <Select value={studioFilter} onValueChange={setStudioFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Studios</SelectItem>
              {studios.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Client</Label>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Booking cards */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-8">No bookings match the selected filters.</p>
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => (
            <Link key={booking.id} to={`/bookings/${booking.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-lg">
                      {booking.client?.first_name} {booking.client?.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getStudioName(booking)}
                    </p>
                  </div>
                  <Badge variant={statusVariant[booking.status]}>{booking.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatTimeRange(booking.start_time, booking.end_time)}</span>
                    {booking.total_amount != null && (
                      <span className="font-medium text-foreground">
                        ${booking.total_amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
