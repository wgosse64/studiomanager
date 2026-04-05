import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile, Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function NewBooking() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Data
  const [clients, setClients] = useState<Profile[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [clientsRes, resourcesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('role', 'client')
          .eq('is_active', true)
          .order('first_name'),
        supabase
          .from('resources')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      setClients(clientsRes.data ?? [])
      setResources(resourcesRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function toggleResource(resourceId: string) {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    )
  }

  function hasStudioSelected(): boolean {
    return selectedResources.some((id) => {
      const r = resources.find((res) => res.id === id)
      return r?.resource_type === 'studio'
    })
  }

  const filteredClients = clients.filter((c) => {
    if (!clientSearch) return true
    const search = clientSearch.toLowerCase()
    return (
      c.first_name.toLowerCase().includes(search) ||
      c.last_name.toLowerCase().includes(search) ||
      c.email.toLowerCase().includes(search) ||
      (c.company?.toLowerCase().includes(search) ?? false)
    )
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError('Please select a client.')
      return
    }
    if (!hasStudioSelected()) {
      setError('Please select at least one studio.')
      return
    }
    if (!startTime || !endTime) {
      setError('Please set both start and end times.')
      return
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setError('End time must be after start time.')
      return
    }

    setSubmitting(true)

    const startISO = new Date(startTime).toISOString()
    const endISO = new Date(endTime).toISOString()

    // Insert booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: clientId,
        booked_by: user!.id,
        start_time: startISO,
        end_time: endISO,
        status: 'requested',
        notes: notes || null,
      })
      .select()
      .single()

    if (bookingError || !bookingData) {
      setError(bookingError?.message ?? 'Failed to create booking.')
      setSubmitting(false)
      return
    }

    // Insert booking_resources
    const timeRange = `[${startISO},${endISO})`
    const resourceInserts = selectedResources.map((resourceId) => ({
      booking_id: bookingData.id,
      resource_id: resourceId,
      time_range: timeRange,
    }))

    const { error: resourceError } = await supabase
      .from('booking_resources')
      .insert(resourceInserts)

    if (resourceError) {
      setError(resourceError.message)
      setSubmitting(false)
      return
    }

    navigate(`/bookings/${bookingData.id}`)
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">New Booking</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">
            {error}
          </div>
        )}

        {/* Step 1: Pick client */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Search Clients</Label>
              <Input
                placeholder="Search by name, email, or company..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Pick resources */}
        <Card>
          <CardHeader>
            <CardTitle>2. Select Resources</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select at least one studio. Optionally add engineers and equipment.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['studio', 'engineer', 'equipment'] as const).map((type) => {
              const typeResources = resources.filter((r) => r.resource_type === type)
              if (typeResources.length === 0) return null

              return (
                <div key={type}>
                  <p className="text-sm font-medium capitalize mb-2">{type}s</p>
                  <div className="flex flex-wrap gap-2">
                    {typeResources.map((r) => {
                      const selected = selectedResources.includes(r.id)
                      return (
                        <Button
                          key={r.id}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleResource(r.id)}
                        >
                          {r.name}
                          {selected && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {type}
                            </Badge>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Step 3: Set times */}
        <Card>
          <CardHeader>
            <CardTitle>3. Set Time</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Notes */}
        <Card>
          <CardHeader>
            <CardTitle>4. Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any notes for this booking..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating Booking...' : 'Create Booking'}
        </Button>
      </form>
    </div>
  )
}
