import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PortalStudios() {
  const [studios, setStudios] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('resources')
      .select('*, studios(*)')
      .eq('resource_type', 'studio')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setStudios(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading studios...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Studios</h1>

      {studios.length === 0 ? (
        <p className="text-muted-foreground">No studios available at this time.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studios.map((resource) => {
            const studio = resource.studios
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
                  {studio && (
                    <div className="flex flex-wrap gap-2 text-sm">
                      {studio.capacity && (
                        <span className="text-muted-foreground">
                          Up to {studio.capacity} musicians
                        </span>
                      )}
                      <span className="font-medium">${studio.hourly_rate}/hr</span>
                      {studio.is_soundproofed && <Badge>Soundproofed</Badge>}
                      {studio.half_day_rate && (
                        <span className="text-muted-foreground">
                          ${studio.half_day_rate} half-day
                        </span>
                      )}
                      {studio.full_day_rate && (
                        <span className="text-muted-foreground">
                          ${studio.full_day_rate} full-day
                        </span>
                      )}
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <Link to={`/portal/studios/${resource.id}/book`}>Book This Studio</Link>
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
