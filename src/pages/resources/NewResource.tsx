import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ResourceType, EquipmentCondition } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function NewResource() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Base fields
  const [resourceType, setResourceType] = useState<ResourceType | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Studio fields
  const [capacity, setCapacity] = useState<number>(1)
  const [hourlyRate, setHourlyRate] = useState<number>(0)
  const [halfDayRate, setHalfDayRate] = useState('')
  const [fullDayRate, setFullDayRate] = useState('')
  const [isSoundproofed, setIsSoundproofed] = useState(false)

  // Engineer fields
  const [specialties, setSpecialties] = useState('')
  const [engRate, setEngRate] = useState('')
  const [userId, setUserId] = useState('')

  // Equipment fields
  const [category, setCategory] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [condition, setCondition] = useState<EquipmentCondition>('good')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resourceType) return

    setSaving(true)
    setError(null)

    // 1. Insert into resources table
    const { data: resource, error: resError } = await supabase
      .from('resources')
      .insert({
        resource_type: resourceType,
        name,
        description,
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single()

    if (resError || !resource) {
      setError(resError?.message ?? 'Failed to create resource')
      setSaving(false)
      return
    }

    // 2. Insert into type-specific table
    let detailError: string | null = null

    if (resourceType === 'studio') {
      const { error: err } = await supabase.from('studios').insert({
        resource_id: resource.id,
        capacity,
        hourly_rate: hourlyRate,
        half_day_rate: halfDayRate ? Number(halfDayRate) : null,
        full_day_rate: fullDayRate ? Number(fullDayRate) : null,
        is_soundproofed: isSoundproofed,
      })
      if (err) detailError = err.message
    }

    if (resourceType === 'engineer') {
      const { error: err } = await supabase.from('engineers').insert({
        resource_id: resource.id,
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        hourly_rate: engRate ? Number(engRate) : null,
        user_id: userId || null,
      })
      if (err) detailError = err.message
    }

    if (resourceType === 'equipment') {
      const { error: err } = await supabase.from('equipment').insert({
        resource_id: resource.id,
        category,
        serial_number: serialNumber,
        condition,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        purchase_date: purchaseDate || null,
      })
      if (err) detailError = err.message
    }

    if (detailError) {
      // Clean up the resource row if the detail insert failed
      await supabase.from('resources').delete().eq('id', resource.id)
      setError(detailError)
      setSaving(false)
      return
    }

    navigate(`/resources/${resourceType}/${resource.id}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="link" className="mb-4 px-0" onClick={() => navigate('/resources')}>
        &larr; Back to resources
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add Resource</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="resourceType">Resource Type</Label>
              <Select
                value={resourceType}
                onValueChange={(v) => setResourceType(v as ResourceType)}
              >
                <SelectTrigger id="resourceType">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {resourceType === 'studio' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="halfDayRate">Half-Day Rate</Label>
                    <Input
                      id="halfDayRate"
                      type="number"
                      step="0.01"
                      value={halfDayRate}
                      onChange={(e) => setHalfDayRate(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullDayRate">Full-Day Rate</Label>
                    <Input
                      id="fullDayRate"
                      type="number"
                      step="0.01"
                      value={fullDayRate}
                      onChange={(e) => setFullDayRate(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="soundproofed"
                    type="checkbox"
                    checked={isSoundproofed}
                    onChange={(e) => setIsSoundproofed(e.target.checked)}
                  />
                  <Label htmlFor="soundproofed">Soundproofed</Label>
                </div>
              </>
            )}

            {resourceType === 'engineer' && (
              <>
                <div>
                  <Label htmlFor="specialties">Specialties (comma-separated)</Label>
                  <Input
                    id="specialties"
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="e.g. Mixing, Mastering, Recording"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="engRate">Hourly Rate</Label>
                    <Input
                      id="engRate"
                      type="number"
                      step="0.01"
                      value={engRate}
                      onChange={(e) => setEngRate(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label htmlFor="userId">Linked User ID</Label>
                    <Input
                      id="userId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Optional UUID"
                    />
                  </div>
                </div>
              </>
            )}

            {resourceType === 'equipment' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      placeholder="e.g. Microphone, Console"
                    />
                  </div>
                  <div>
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={condition}
                      onValueChange={(v) => setCondition(v as EquipmentCondition)}
                    >
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="needs_repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purchasePrice">Purchase Price</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button type="submit" disabled={saving || !resourceType} className="w-full">
              {saving ? 'Creating...' : 'Create Resource'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
