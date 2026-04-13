import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PortalEquipment() {
  const [equipment, setEquipment] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('resources')
      .select('*, equipment!equipment_resource_id_fkey(*)')
      .eq('resource_type', 'equipment')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setEquipment(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading equipment...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Equipment</h1>

      {equipment.length === 0 ? (
        <p className="text-muted-foreground">No equipment available at this time.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {equipment.map((resource) => {
            const equip = resource.equipment
            return (
              <Card key={resource.id}>
                <CardHeader>
                  <CardTitle>{resource.name}</CardTitle>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {equip && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{equip.category}</Badge>
                      <Badge variant="outline">{equip.condition}</Badge>
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <Link to={`/portal/equipment/${resource.id}/book`}>Book This Equipment</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
