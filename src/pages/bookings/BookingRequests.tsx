import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function BookingRequests() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('bookings')
      .select('*, client:profiles!client_id(*)')
      .eq('status', 'requested')
      .order('start_time', { ascending: true })
    setBookings(data ?? [])
    setLoading(false)
  }

  async function handleAction(bookingId: string, newStatus: 'confirmed' | 'cancelled') {
    setActionLoading(bookingId)
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)

    if (!error) {
      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
    }
    setActionLoading(null)
  }

  function formatRequestedTime(start: string, end: string): string {
    const s = new Date(start)
    const e = new Date(end)
    return `${s.toLocaleDateString()} ${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading requests...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Booking Requests</h1>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground py-8">No pending booking requests.</p>
      ) : (
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg">
                    {booking.client?.first_name} {booking.client?.last_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatRequestedTime(booking.start_time, booking.end_time)}
                  </p>
                </div>
                <Badge variant="outline">Requested</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.client_notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Client Notes</p>
                    <p className="text-sm text-muted-foreground">{booking.client_notes}</p>
                  </div>
                )}
                {booking.notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Internal Notes</p>
                    <p className="text-sm text-muted-foreground">{booking.notes}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAction(booking.id, 'confirmed')}
                    disabled={actionLoading === booking.id}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction(booking.id, 'cancelled')}
                    disabled={actionLoading === booking.id}
                  >
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
