import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Profile, Booking, Invoice, FileRecord, Message } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Profile | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function load() {
      const [profileRes, bookingsRes, invoicesRes, filesRes, messagesRes] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', id).single(),
          supabase
            .from('bookings')
            .select('*')
            .eq('client_id', id)
            .order('start_time', { ascending: false }),
          supabase
            .from('invoices')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
          supabase
            .from('files')
            .select('*')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
          supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(first_name, last_name)')
            .eq('client_id', id)
            .order('created_at', { ascending: false }),
        ])

      if (profileRes.data) {
        setClient(profileRes.data)
        setNotes(profileRes.data.notes ?? '')
      }
      setBookings(bookingsRes.data ?? [])
      setInvoices(invoicesRes.data ?? [])
      setFiles(filesRes.data ?? [])
      setMessages(messagesRes.data ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSaveNotes() {
    if (!id) return
    setSavingNotes(true)
    await supabase
      .from('profiles')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', id)
    setSavingNotes(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-muted-foreground">
        Loading client...
      </div>
    )
  }

  if (!client) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Client not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/clients">Back to Clients</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-muted-foreground">{client.company ?? 'No company'}</p>
        </div>
        <Badge variant={client.is_active ? 'default' : 'secondary'}>
          {client.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Contact Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{client.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium">{client.phone ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Company</span>
              <p className="font-medium">{client.company ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Member since</span>
              <p className="font-medium">
                {new Date(client.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="notes">Staff-only notes about this client</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add internal notes..."
            />
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="mb-8" />

      {/* Tabs */}
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">
            Bookings ({bookings.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({messages.length})
          </TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          {bookings.length === 0 ? (
            <p className="text-muted-foreground py-4">No bookings yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {new Date(b.start_time).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(b.start_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(b.end_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {b.total_amount != null
                        ? `$${b.total_amount.toFixed(2)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <p className="text-muted-foreground py-4">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.invoice_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>${inv.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          {files.length === 0 ? (
            <p className="text-muted-foreground py-4">No files yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.file_name}</TableCell>
                    <TableCell>{f.file_type}</TableCell>
                    <TableCell>
                      {(f.file_size / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell>{f.label ?? '—'}</TableCell>
                    <TableCell>
                      {new Date(f.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          {messages.length === 0 ? (
            <p className="text-muted-foreground py-4">No messages yet.</p>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => (
                <Card key={msg.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {(msg as any).sender
                          ? `${(msg as any).sender.first_name} ${(msg as any).sender.last_name}`
                          : 'Unknown'}
                      </span>
                      <div className="flex items-center gap-2">
                        {msg.is_internal && (
                          <Badge variant="secondary">Internal</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
