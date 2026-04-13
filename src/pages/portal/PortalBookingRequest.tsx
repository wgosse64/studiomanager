import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PortalBookingRequest() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [studios, setStudios] = useState<Resource[]>([])
  const [engineers, setEngineers] = useState<Resource[]>([])
  const [equipment, setEquipment] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedStudio, setSelectedStudio] = useState<string | null>(null)
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('14:00')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      const all = data ?? []
      setStudios(all.filter(r => r.resource_type === 'studio'))
      setEngineers(all.filter(r => r.resource_type === 'engineer'))
      setEquipment(all.filter(r => r.resource_type === 'equipment'))
      setLoading(false)
    }
    load()
  }, [])

  function toggleEngineer(id: string) {
    setSelectedEngineers(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  function toggleEquipment(id: string) {
    setSelectedEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const allSelected = [
      ...(selectedStudio ? [selectedStudio] : []),
      ...selectedEngineers,
      ...selectedEquipment,
    ]
    if (!user || !date || allSelected.length === 0) return

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

    const resourceIds = allSelected
    const timeRange = `[${startISO},${endISO})`

    const { error: brError } = await supabase
      .from('booking_resources')
      .insert(
        resourceIds.map(resource_id => ({
          booking_id: booking.id,
          resource_id,
          time_range: timeRange,
        }))
      )

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Request a Booking</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Studio (optional)</CardTitle>
            <p className="text-sm text-muted-foreground">Pick a studio, or skip if you only need equipment or an engineer.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {studios.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStudio(selectedStudio === s.id ? null : s.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedStudio === s.id
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

        <Card>
          <CardHeader><CardTitle className="text-lg">Date & Time</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {engineers.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Engineer (optional)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {engineers.map(eng => (
                  <button
                    key={eng.id}
                    type="button"
                    onClick={() => toggleEngineer(eng.id)}
                  >
                    <Badge variant={selectedEngineers.includes(eng.id) ? 'default' : 'outline'}>
                      {eng.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {equipment.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Equipment (optional)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {equipment.map(eq => (
                  <button
                    key={eq.id}
                    type="button"
                    onClick={() => toggleEquipment(eq.id)}
                  >
                    <Badge variant={selectedEquipment.includes(eq.id) ? 'default' : 'outline'}>
                      {eq.name}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any details about your session — project type, number of musicians, special requirements..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting || !date || (!selectedStudio && selectedEngineers.length === 0 && selectedEquipment.length === 0)}>
          {submitting ? 'Submitting...' : 'Submit Booking Request'}
        </Button>
      </form>
    </div>
  )
}
