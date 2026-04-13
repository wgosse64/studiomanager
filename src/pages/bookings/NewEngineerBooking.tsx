import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Resource, Profile, Booking, BookingResource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NotesCard } from '@/components/booking/NotesCard'
import { ExistingBookingSelector } from '@/components/booking/ExistingBookingSelector'

type BookingWithResources = Booking & {
  booking_resources: (BookingResource & { resource: Resource })[]
}

export function NewEngineerBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [engineers, setEngineers] = useState<Resource[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedEngineerId, setSelectedEngineerId] = useState<string | null>(null)
  const [mode, setMode] = useState<'standalone' | 'attach'>('standalone')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<BookingWithResources | null>(null)

  useEffect(() => {
    async function load() {
      const [engRes, clientRes] = await Promise.all([
        supabase
          .from('resources')
          .select('*, engineers(*)')
          .eq('resource_type', 'engineer')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'client')
          .eq('is_active', true)
          .order('first_name'),
      ])
      setEngineers(engRes.data ?? [])
      setClients(clientRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function handleBookingSelect(booking: BookingWithResources | null) {
    setSelectedBooking(booking)
    if (booking) {
      // Format for datetime-local display
      const start = new Date(booking.start_time)
      const end = new Date(booking.end_time)
      setStartTime(toLocalDatetimeString(start))
      setEndTime(toLocalDatetimeString(end))
    }
  }

  function toLocalDatetimeString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedClientId || !selectedEngineerId || !startTime || !endTime) return

    setSubmitting(true)

    const startISO = new Date(startTime).toISOString()
    const endISO = new Date(endTime).toISOString()
    const timeRange = `[${startISO},${endISO})`

    if (mode === 'attach' && selectedBooking) {
      // Just add the engineer resource to the existing booking
      const { error: brError } = await supabase
        .from('booking_resources')
        .insert({
          booking_id: selectedBooking.id,
          resource_id: selectedEngineerId,
          time_range: timeRange,
        })

      if (brError) {
        alert(`Scheduling conflict: ${brError.message}`)
        setSubmitting(false)
        return
      }

      navigate(`/bookings/${selectedBooking.id}`)
      return
    }

    // Standalone: create a new booking
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        client_id: selectedClientId,
        booked_by: user.id,
        start_time: startISO,
        end_time: endISO,
        status: 'confirmed',
        notes: notes || null,
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
        resource_id: selectedEngineerId,
        time_range: timeRange,
      })

    if (brError) {
      alert(`Scheduling conflict: ${brError.message}`)
      await supabase.from('bookings').delete().eq('id', booking.id)
      setSubmitting(false)
      return
    }

    navigate(`/bookings/${booking.id}`)
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  const canSubmit =
    selectedClientId &&
    selectedEngineerId &&
    startTime &&
    endTime &&
    (mode === 'standalone' || selectedBooking)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Book Engineer</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setSelectedBooking(null) }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Select Engineer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Engineer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {engineers.map(eng => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setSelectedEngineerId(selectedEngineerId === eng.id ? null : eng.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedEngineerId === eng.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">{eng.name}</p>
                  {eng.description && <p className="text-sm text-muted-foreground mt-1">{eng.description}</p>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Booking Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('standalone'); setSelectedBooking(null) }}
              >
                <Badge variant={mode === 'standalone' ? 'default' : 'outline'}>Standalone</Badge>
              </button>
              <button
                type="button"
                onClick={() => setMode('attach')}
              >
                <Badge variant={mode === 'attach' ? 'default' : 'outline'}>Add to Existing Booking</Badge>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time or Existing Booking Selector */}
        {mode === 'standalone' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date & Time</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Start</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedClientId ? (
              <ExistingBookingSelector
                clientId={selectedClientId}
                onSelect={handleBookingSelect}
                selectedBookingId={selectedBooking?.id}
              />
            ) : (
              <Card>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">Select a client first to see their existing bookings.</p>
                </CardContent>
              </Card>
            )}

            {selectedBooking && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Date & Time</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start">Start</Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        value={startTime}
                        readOnly
                        className="opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end">End</Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        value={endTime}
                        readOnly
                        className="opacity-60"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Notes */}
        <NotesCard
          value={notes}
          onChange={setNotes}
          title="Internal Notes"
          placeholder="Internal notes about this booking..."
        />

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !canSubmit}
        >
          {submitting
            ? 'Creating...'
            : mode === 'attach'
              ? 'Add Engineer to Booking'
              : 'Create Engineer Booking'}
        </Button>
      </form>
    </div>
  )
}
