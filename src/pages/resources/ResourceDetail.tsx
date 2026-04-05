import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type {
  Resource,
  ResourceType,
  StudioDetail,
  EngineerDetail,
  EquipmentDetail,
  StudioFeature,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function ResourceDetail() {
  const { type, id } = useParams<{ type: ResourceType; id: string }>()
  const navigate = useNavigate()
  const [resource, setResource] = useState<Resource | null>(null)
  const [features, setFeatures] = useState<StudioFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('resources')
        .select('*, studios(*), engineers(*), equipment!equipment_resource_id_fkey(*)')
        .eq('id', id!)
        .single()
      setResource(data)

      if (data?.resource_type === 'studio' && data.studios) {
        const { data: feats } = await supabase
          .from('studio_features')
          .select('*')
          .eq('studio_id', data.studios.id)
        setFeatures(feats ?? [])
      }

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!resource) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Resource not found.</p>
        <Button variant="link" onClick={() => navigate('/resources')}>
          Back to resources
        </Button>
      </div>
    )
  }

  const studio = resource.studios as StudioDetail | undefined
  const engineer = resource.engineers as EngineerDetail | undefined
  const equip = resource.equipment as EquipmentDetail | undefined

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="link" className="mb-4 px-0" onClick={() => navigate('/resources')}>
        &larr; Back to resources
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{resource.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
          </div>
          <Badge variant={resource.is_active ? 'default' : 'secondary'}>
            {resource.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {studio && <StudioInfo studio={studio} features={features} />}
          {engineer && <EngineerInfo engineer={engineer} />}
          {equip && <EquipmentInfo equipment={equip} />}

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button>Edit Resource</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit {resource.name}</DialogTitle>
              </DialogHeader>
              <EditForm
                resource={resource}
                studio={studio}
                engineer={engineer}
                equipment={equip}
                onSaved={(updated) => {
                  setResource(updated)
                  setEditOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

function StudioInfo({
  studio,
  features,
}: {
  studio: StudioDetail
  features: StudioFeature[]
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Studio Details</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-muted-foreground">Capacity</span>
        <span>{studio.capacity}</span>
        <span className="text-muted-foreground">Hourly Rate</span>
        <span>${studio.hourly_rate}</span>
        {studio.half_day_rate && (
          <>
            <span className="text-muted-foreground">Half-Day Rate</span>
            <span>${studio.half_day_rate}</span>
          </>
        )}
        {studio.full_day_rate && (
          <>
            <span className="text-muted-foreground">Full-Day Rate</span>
            <span>${studio.full_day_rate}</span>
          </>
        )}
        <span className="text-muted-foreground">Soundproofed</span>
        <span>{studio.is_soundproofed ? 'Yes' : 'No'}</span>
      </div>
      {features.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Features</p>
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (
              <Badge key={f.id} variant="secondary">
                {f.feature_name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EngineerInfo({ engineer }: { engineer: EngineerDetail }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Engineer Details</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {engineer.hourly_rate && (
          <>
            <span className="text-muted-foreground">Hourly Rate</span>
            <span>${engineer.hourly_rate}</span>
          </>
        )}
        {engineer.user_id && (
          <>
            <span className="text-muted-foreground">Linked User</span>
            <span className="font-mono text-xs">{engineer.user_id}</span>
          </>
        )}
      </div>
      {engineer.specialties.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Specialties</p>
          <div className="flex flex-wrap gap-2">
            {engineer.specialties.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EquipmentInfo({ equipment }: { equipment: EquipmentDetail }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Equipment Details</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-muted-foreground">Category</span>
        <span>{equipment.category}</span>
        <span className="text-muted-foreground">Serial Number</span>
        <span className="font-mono">{equipment.serial_number}</span>
        <span className="text-muted-foreground">Condition</span>
        <span className="capitalize">{equipment.condition}</span>
        {equipment.purchase_price && (
          <>
            <span className="text-muted-foreground">Purchase Price</span>
            <span>${equipment.purchase_price}</span>
          </>
        )}
        {equipment.purchase_date && (
          <>
            <span className="text-muted-foreground">Purchase Date</span>
            <span>{equipment.purchase_date}</span>
          </>
        )}
        {equipment.default_studio_id && (
          <>
            <span className="text-muted-foreground">Default Studio</span>
            <span className="font-mono text-xs">{equipment.default_studio_id}</span>
          </>
        )}
      </div>
    </div>
  )
}

function EditForm({
  resource,
  studio,
  engineer,
  equipment,
  onSaved,
}: {
  resource: Resource
  studio?: StudioDetail
  engineer?: EngineerDetail
  equipment?: EquipmentDetail
  onSaved: (updated: Resource) => void
}) {
  const [name, setName] = useState(resource.name)
  const [description, setDescription] = useState(resource.description)
  const [saving, setSaving] = useState(false)

  // Studio fields
  const [capacity, setCapacity] = useState(studio?.capacity ?? 0)
  const [hourlyRate, setHourlyRate] = useState(studio?.hourly_rate ?? 0)
  const [halfDayRate, setHalfDayRate] = useState(studio?.half_day_rate ?? '')
  const [fullDayRate, setFullDayRate] = useState(studio?.full_day_rate ?? '')
  const [isSoundproofed, setIsSoundproofed] = useState(studio?.is_soundproofed ?? false)

  // Engineer fields
  const [specialties, setSpecialties] = useState(engineer?.specialties.join(', ') ?? '')
  const [engRate, setEngRate] = useState(engineer?.hourly_rate ?? '')
  const [userId, setUserId] = useState(engineer?.user_id ?? '')

  // Equipment fields
  const [category, setCategory] = useState(equipment?.category ?? '')
  const [serialNumber, setSerialNumber] = useState(equipment?.serial_number ?? '')
  const [condition, setCondition] = useState(equipment?.condition ?? 'good')
  const [purchasePrice, setPurchasePrice] = useState(equipment?.purchase_price ?? '')
  const [purchaseDate, setPurchaseDate] = useState(equipment?.purchase_date ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error: resError } = await supabase
      .from('resources')
      .update({ name, description })
      .eq('id', resource.id)

    if (resError) {
      setSaving(false)
      return
    }

    if (studio) {
      await supabase
        .from('studios')
        .update({
          capacity,
          hourly_rate: hourlyRate,
          half_day_rate: halfDayRate || null,
          full_day_rate: fullDayRate || null,
          is_soundproofed: isSoundproofed,
        })
        .eq('resource_id', resource.id)
    }

    if (engineer) {
      await supabase
        .from('engineers')
        .update({
          specialties: specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          hourly_rate: engRate || null,
          user_id: userId || null,
        })
        .eq('resource_id', resource.id)
    }

    if (equipment) {
      await supabase
        .from('equipment')
        .update({
          category,
          serial_number: serialNumber,
          condition,
          purchase_price: purchasePrice || null,
          purchase_date: purchaseDate || null,
        })
        .eq('resource_id', resource.id)
    }

    // Refetch the full resource
    const { data: updated } = await supabase
      .from('resources')
      .select('*, studios(*), engineers(*), equipment!equipment_resource_id_fkey(*)')
      .eq('id', resource.id)
      .single()

    setSaving(false)
    if (updated) onSaved(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {studio && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
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
                onChange={(e) => setHalfDayRate(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <Label htmlFor="fullDayRate">Full-Day Rate</Label>
              <Input
                id="fullDayRate"
                type="number"
                step="0.01"
                value={fullDayRate}
                onChange={(e) => setFullDayRate(e.target.value ? Number(e.target.value) : '')}
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

      {engineer && (
        <>
          <div>
            <Label htmlFor="specialties">Specialties (comma-separated)</Label>
            <Input
              id="specialties"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
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
                onChange={(e) => setEngRate(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div>
              <Label htmlFor="userId">Linked User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {equipment && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
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
              <select
                id="condition"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={condition}
                onChange={(e) => setCondition(e.target.value as EquipmentDetail['condition'])}
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="needs_repair">Needs Repair</option>
              </select>
            </div>
            <div>
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
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

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
