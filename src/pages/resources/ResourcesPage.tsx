import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Resource, ResourceType } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('resources')
        .select('*, studios(*), engineers(*), equipment!equipment_resource_id_fkey(*)')
        .order('sort_order')
      if (error) console.error('Resources fetch error:', error)
      console.log('Resources data:', data)
      setResources(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDeactivate(id: string, currentlyActive: boolean) {
    const { error } = await supabase
      .from('resources')
      .update({ is_active: !currentlyActive })
      .eq('id', id)
    if (!error) {
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: !currentlyActive } : r))
      )
    }
  }

  function filterByType(type: ResourceType) {
    return resources.filter((r) => r.resource_type === type)
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading resources...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Resources</h1>
        <Button asChild>
          <Link to="/resources/new">Add Resource</Link>
        </Button>
      </div>

      <Tabs defaultValue="studio">
        <TabsList>
          <TabsTrigger value="studio">Studios</TabsTrigger>
          <TabsTrigger value="engineer">Engineers</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
        </TabsList>

        {(['studio', 'engineer', 'equipment'] as ResourceType[]).map((type) => (
          <TabsContent key={type} value={type}>
            {filterByType(type).length === 0 ? (
              <p className="text-muted-foreground py-8">No {type} resources found.</p>
            ) : (
              <div className="grid gap-4">
                {filterByType(type).map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onDeactivate={handleDeactivate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function ResourceCard({
  resource,
  onDeactivate,
}: {
  resource: Resource
  onDeactivate: (id: string, isActive: boolean) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">{resource.name}</CardTitle>
          {resource.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>
        <Badge variant={resource.is_active ? 'default' : 'secondary'}>
          {resource.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/resources/${resource.resource_type}/${resource.id}`}>View / Edit</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeactivate(resource.id, resource.is_active)}
          >
            {resource.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
