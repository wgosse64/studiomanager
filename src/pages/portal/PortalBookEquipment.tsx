import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Resource, Booking, BookingResource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateTimeCard } from '@/components/booking/DateTimeCard'
import { NotesCard } from '@/components/booking/NotesCard'
import { ExistingBookingSelector } from '@/components/booking/ExistingBookingSelector'

type BookingWithResources = Booking & {
  booking_resources: (BookingResource & { resource: Resource })[]
}

type BookingMode = 'standalone' | 'attach'

export function PortalBookEquipment() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [mode, setMode] = useState<BookingMode>('standalone')
  const [selectedBooking, setSelectedBooking] = useState<BookingWithResources | null>(null)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('14:00')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      if (!resourceId) return
      const { data } = await supabase
        .from('resources')
        .select('*, equipment!equipment_resource_id_fkey(*)')
        .eq('id', resourceId)
        .single()
      setResource(data as Resource | null)
      setLoading(false)
    }
    load()
  }, [resourceId])

  // Derive date/time from selected booking in attach mode
  const attachDate = selectedBooking
    ? new Date(selectedBooking.start_time).toISOString().slice(0, 10)
    : ''
  const attachStartTime = selectedBooking
    ? new Date(selectedBooking.start_time).toTimeString().slice(0, 5)
    : ''
  const attachEndTime = selectedBooking
    ? new Date(selectedBooking.end_time).toTimeString().slice(0, 5)
    : ''

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !resourceId) return

    setSubmitting(true)

    if (mode === 'standalone') {
      if (!date) {
        setSubmitting(false)
        return
      }

      const startISO = new Date(`${date}T${startTime}`).toISOString()
      const endISO = new Date(`${date}T${endTime}`).toISOString()

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          client_id: user.id,
          booked_by: user.id,
          start_time: startISO,
          end_time: endISO,
          status: 'requested',
          client_notes: notes || null,
        })
        .select()
        .single()

      if (error || !booking) {
        alert(`Error: ${error?.message ?? 'Failed to create booking'}`)
        setSubmitting(false)
        return
      }

      const { error: brError } = await supabase
        .from('booking_resources')
        .insert({
          booking_id: booking.id,
          resource_id: resourceId,
          time_range: `[${startISO},${endISO})`,
        })

      if (brError) {
        alert(`Scheduling conflict: ${brError.message}`)
        await supabase.from('bookings').delete().eq('id', booking.id)
        setSubmitting(false)
        return
      }

      navigate('/portal/bookings')
    } else {
      // Attach mode
      if (!selectedBooking) {
        setSubmitting(false)
        return
      }

      const startISO = new Date(selectedBooking.start_time).toISOString()
      const endISO = new Date(selectedBooking.end_time).toISOString()

      const { error: brError } = await supabase
        .from('booking_resources')
        .insert({
          booking_id: selectedBooking.id,
          resource_id: resourceId,
          time_range: `[${startISO},${endISO})`,
        })

      if (brError) {
        alert(`Scheduling conflict: ${brError.message}`)
        setSubmitting(false)
        return
      }

      navigate(`/portal/bookings/${selectedBooking.id}`)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!resource) {
    return <div className="flex justify-center p-12 text-muted-foreground">Equipment not found.</div>
  }

  const equip = resource.equipment
  const isStandalone = mode === 'standalone'
  const canSubmit = isStandalone ? !!date : !!selectedBooking

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Book {resource.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{resource.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {equip?.category && (
            <Badge variant="outline">{equip.category}</Badge>
          )}
          {equip?.condition && (
            <Badge variant="outline">Condition: {equip.condition}</Badge>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isStandalone ? 'default' : 'outline'}
                onClick={() => { setMode('standalone'); setSelectedBooking(null) }}
              >
                Standalone Session
              </Button>
              <Button
                type="button"
                variant={!isStandalone ? 'default' : 'outline'}
                onClick={() => setMode('attach')}
              >
                Add to Studio Booking
              </Button>
            </div>
          </CardContent>
        </Card>

        {isStandalone ? (
          <DateTimeCard
            date={date}
            startTime={startTime}
            endTime={endTime}
            onDateChange={setDate}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
          />
        ) : (
          <>
            {user && (
              <ExistingBookingSelector
                clientId={user.id}
                onSelect={setSelectedBooking}
                selectedBookingId={selectedBooking?.id}
              />
            )}
            {selectedBooking && (
              <DateTimeCard
                date={attachDate}
                startTime={attachStartTime}
                endTime={attachEndTime}
                onDateChange={() => {}}
                onStartTimeChange={() => {}}
                onEndTimeChange={() => {}}
                readOnly
              />
            )}
          </>
        )}

        <NotesCard value={notes} onChange={setNotes} />

        <Button type="submit" className="w-full" disabled={submitting || !canSubmit}>
          {submitting ? 'Submitting...' : isStandalone ? 'Request Equipment Booking' : 'Add Equipment to Booking'}
        </Button>
      </form>
    </div>
  )
}
