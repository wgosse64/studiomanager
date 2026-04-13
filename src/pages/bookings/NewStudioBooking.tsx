import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Resource, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NotesCard } from '@/components/booking/NotesCard'

export function NewStudioBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [studios, setStudios] = useState<Resource[]>([])
  const [clients, setClients] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const [studioRes, clientRes] = await Promise.all([
        supabase
          .from('resources')
          .select('*, studios(*)')
          .eq('resource_type', 'studio')
          .eq('is_active', true)
          .order('sort_order'),
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'client')
          .eq('is_active', true)
          .order('first_name'),
      ])
      setStudios(studioRes.data ?? [])
      setClients(clientRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedClientId || !selectedStudioId || !startTime || !endTime) return

    setSubmitting(true)

    const startISO = new Date(startTime).toISOString()
    const endISO = new Date(endTime).toISOString()

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

    const timeRange = `[${startISO},${endISO})`

    const { error: brError } = await supabase
      .from('booking_resources')
      .insert({
        booking_id: booking.id,
        resource_id: selectedStudioId,
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Book Studio</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Client</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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

        {/* Select Studio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Studio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {studios.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudioId(selectedStudioId === s.id ? null : s.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedStudioId === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">{s.name}</p>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
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
          disabled={submitting || !selectedClientId || !selectedStudioId || !startTime || !endTime}
        >
          {submitting ? 'Creating...' : 'Create Studio Booking'}
        </Button>
      </form>
    </div>
  )
}
