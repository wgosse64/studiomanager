import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateTimeCard } from '@/components/booking/DateTimeCard'
import { NotesCard } from '@/components/booking/NotesCard'

export function PortalBookStudio() {
  const { resourceId } = useParams<{ resourceId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('14:00')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      if (!resourceId) return
      const { data } = await supabase
        .from('resources')
        .select('*, studios(*)')
        .eq('id', resourceId)
        .single()
      setResource(data as Resource | null)
      setLoading(false)
    }
    load()
  }, [resourceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !resourceId || !date) return

    setSubmitting(true)

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
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!resource) {
    return <div className="flex justify-center p-12 text-muted-foreground">Studio not found.</div>
  }

  const studio = resource.studios

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Book {resource.name}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{resource.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {studio?.capacity && (
            <Badge variant="outline">Capacity: {studio.capacity}</Badge>
          )}
          {studio?.hourly_rate != null && (
            <Badge variant="outline">${studio.hourly_rate}/hr</Badge>
          )}
          {studio?.half_day_rate != null && (
            <Badge variant="outline">${studio.half_day_rate} half-day</Badge>
          )}
          {studio?.full_day_rate != null && (
            <Badge variant="outline">${studio.full_day_rate} full-day</Badge>
          )}
          {studio?.is_soundproofed && (
            <Badge variant="outline">Soundproofed</Badge>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DateTimeCard
          date={date}
          startTime={startTime}
          endTime={endTime}
          onDateChange={setDate}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
        />

        <NotesCard value={notes} onChange={setNotes} />

        <Button type="submit" className="w-full" disabled={submitting || !date}>
          {submitting ? 'Submitting...' : 'Request Studio Booking'}
        </Button>
      </form>
    </div>
  )
}
