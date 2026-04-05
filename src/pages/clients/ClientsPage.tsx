import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ClientsPage() {
  const [clients, setClients] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('last_name', { ascending: true })
      setClients(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-muted-foreground">
        Loading clients...
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button asChild>
          <Link to="/clients/invite">Invite Client</Link>
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, company, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              No clients found.
            </CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        to={`/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.first_name} {client.last_name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.company ?? '—'}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={client.is_active ? 'default' : 'secondary'}
                      >
                        {client.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
