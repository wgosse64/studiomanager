import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking, BookingResource, Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type BookingWithResources = Booking & {
  booking_resources: (BookingResource & { resource: Resource })[]
}

interface ExistingBookingSelectorProps {
  clientId: string
  onSelect: (booking: BookingWithResources | null) => void
  selectedBookingId?: string
}

export function ExistingBookingSelector({
  clientId,
  onSelect,
  selectedBookingId,
}: ExistingBookingSelectorProps) {
  const [bookings, setBookings] = useState<BookingWithResources[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('*, booking_resources(*, resource:resources(*))')
        .eq('client_id', clientId)
        .in('status', ['requested', 'confirmed'])
        .gte('start_time', new Date().toISOString())
        .order('start_time')

      // Only show bookings that have at least one studio resource
      const studioBookings = (data ?? []).filter((b: BookingWithResources) =>
        b.booking_resources?.some(br => br.resource?.resource_type === 'studio')
      )

      setBookings(studioBookings)
      setLoading(false)
    }
    load()
  }, [clientId])

  function getStudioName(booking: BookingWithResources): string {
    const studio = booking.booking_resources?.find(
      br => br.resource?.resource_type === 'studio'
    )
    return studio?.resource?.name ?? 'Studio'
  }

  function formatBooking(booking: BookingWithResources): string {
    const date = new Date(booking.start_time).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const start = new Date(booking.start_time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    const end = new Date(booking.end_time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${getStudioName(booking)} — ${date}, ${start} - ${end}`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Loading bookings...</p>
        </CardContent>
      </Card>
    )
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            No upcoming studio bookings to attach to. Create a studio booking first, or use standalone mode.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Select Studio Booking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label>Attach to</Label>
          <Select
            value={selectedBookingId ?? ''}
            onValueChange={value => {
              const booking = bookings.find(b => b.id === value) ?? null
              onSelect(booking)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a booking..." />
            </SelectTrigger>
            <SelectContent>
              {bookings.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {formatBooking(b)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
