import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Resource } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function PortalEngineers() {
  const [engineers, setEngineers] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('resources')
      .select('*, engineers(*)')
      .eq('resource_type', 'engineer')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        setEngineers(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading engineers...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Engineers</h1>

      {engineers.length === 0 ? (
        <p className="text-muted-foreground">No engineers available at this time.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {engineers.map((resource) => {
            const engineer = resource.engineers
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
                  {engineer && (
                    <div className="flex flex-wrap gap-2">
                      {engineer.specialties?.map((specialty) => (
                        <Badge key={specialty} variant="secondary">
                          {specialty}
                        </Badge>
                      ))}
                      {engineer.hourly_rate && (
                        <span className="text-sm font-medium">${engineer.hourly_rate}/hr</span>
                      )}
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <Link to={`/portal/engineers/${resource.id}/book`}>Book This Engineer</Link>
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
