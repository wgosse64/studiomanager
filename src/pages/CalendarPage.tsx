import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Resource, BookingResource, Booking } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8am–9pm

interface CalendarBooking {
  booking: Booking
  resource_id: string
  start: Date
  end: Date
}

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-200 border-yellow-400 text-yellow-900',
  confirmed: 'bg-green-200 border-green-400 text-green-900',
  completed: 'bg-gray-200 border-gray-400 text-gray-700',
  cancelled: 'bg-red-100 border-red-300 text-red-700',
}

export function CalendarPage() {
  const [studios, setStudios] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<CalendarBooking[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(0)
  const [loading, setLoading] = useState(true)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const displayDates = viewMode === 'day' ? [weekDates[selectedDay]] : weekDates

  useEffect(() => {
    async function load() {
      const { data: resourceData } = await supabase
        .from('resources')
        .select('*')
        .eq('resource_type', 'studio')
        .eq('is_active', true)
        .order('sort_order')

      setStudios(resourceData ?? [])

      const rangeStart = weekDates[0].toISOString()
      const rangeEnd = new Date(weekDates[6].getTime() + 86400000).toISOString()

      const { data: brData } = await supabase
        .from('booking_resources')
        .select('*, bookings(*)')
        .overlaps('time_range', `[${rangeStart},${rangeEnd})`)

      const calBookings: CalendarBooking[] = (brData ?? [])
        .filter((br: { bookings: Booking }) => br.bookings?.status !== 'cancelled')
        .map((br: { bookings: Booking; resource_id: string; time_range: string }) => {
          const range = br.time_range
          const match = range.match(/["[\(](.+?),(.+?)["\])]/)
          const start = match ? new Date(match[1].trim().replace('"', '')) : new Date()
          const end = match ? new Date(match[2].trim().replace('"', '')) : new Date()
          return { booking: br.bookings, resource_id: br.resource_id, start, end }
        })

      setBookings(calBookings)
      setLoading(false)
    }
    load()
  }, [weekOffset, weekDates, reloadTrigger])

  // Real-time subscription — use a counter to force reload
  const [reloadTrigger, setReloadTrigger] = useState(0)
  useEffect(() => {
    const channel = supabase
      .channel('calendar-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_resources' }, () => {
        setReloadTrigger(n => n + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function getBookingsForCell(studioId: string, date: Date) {
    return bookings.filter(b => {
      if (b.resource_id !== studioId) return false
      const bookingDate = b.start.toDateString()
      return bookingDate === date.toDateString()
    })
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading calendar...</div>
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
            Next
          </Button>
          <Button asChild size="sm">
            <Link to="/bookings/new">New Booking</Link>
          </Button>
        </div>
      </div>

      {viewMode === 'week' && (
        <div className="flex gap-1 mb-4">
          {weekDates.map((d, i) => (
            <Button
              key={i}
              variant={selectedDay === i ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 text-xs"
              onClick={() => { setSelectedDay(i); setViewMode('day') }}
            >
              {formatDate(d)}
            </Button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${displayDates.length}, 1fr)` }}>
            <div className="text-sm font-medium text-muted-foreground p-2">Studio</div>
            {displayDates.map((d, i) => (
              <div key={i} className="text-sm font-medium text-center p-2 border-b">
                {formatDate(d)}
              </div>
            ))}
          </div>

          {/* Studio rows */}
          {studios.map(studio => (
            <div
              key={studio.id}
              className="grid gap-2 border-b"
              style={{ gridTemplateColumns: `120px repeat(${displayDates.length}, 1fr)` }}
            >
              <div className="text-sm font-medium p-2 flex items-start pt-3">
                {studio.name}
              </div>
              {displayDates.map((date, di) => {
                const cellBookings = getBookingsForCell(studio.id, date)
                return (
                  <div key={di} className="min-h-[80px] p-1 border-l">
                    {cellBookings.map(cb => (
                      <Link
                        key={cb.booking.id}
                        to={`/bookings/${cb.booking.id}`}
                        className={`block text-xs p-1.5 rounded border mb-1 ${statusColors[cb.booking.status] ?? ''}`}
                      >
                        <div className="font-medium truncate">
                          {cb.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {cb.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {studios.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground mt-4">
          No studios configured yet. <Link to="/resources/new" className="underline">Add a studio</Link> to get started.
        </Card>
      )}
    </div>
  )
}
