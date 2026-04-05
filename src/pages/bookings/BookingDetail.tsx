import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Booking, BookingStatus, Invoice, Message } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const statusVariant: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  confirmed: 'default',
  cancelled: 'destructive',
  completed: 'secondary',
}

const resourceTypeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  studio: 'default',
  engineer: 'secondary',
  equipment: 'outline',
}

export function BookingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  // Edit time dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)

  // New message state
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    if (id) loadBooking()
  }, [id])

  async function loadBooking() {
    const [bookingRes, messagesRes] = await Promise.all([
      supabase
        .from('bookings')
        .select(
          '*, client:profiles!client_id(*), booked_by_profile:profiles!booked_by(*), booking_resources(*, resource:resources(*))'
        )
        .eq('id', id!)
        .single(),
      supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(*)')
        .eq('booking_id', id!)
        .order('created_at', { ascending: true }),
    ])

    const bookingData = bookingRes.data as Booking | null
    setBooking(bookingData)
    setMessages(messagesRes.data ?? [])

    if (bookingData) {
      setEditStart(bookingData.start_time.slice(0, 16))
      setEditEnd(bookingData.end_time.slice(0, 16))

      // Check for linked invoice
      const { data: invoiceData } = await supabase
        .from('invoice_line_items')
        .select('invoice:invoices(*)')
        .eq('booking_id', bookingData.id)
        .limit(1)
        .single()

      if (invoiceData?.invoice) {
        setInvoice(invoiceData.invoice as unknown as Invoice)
      }
    }

    setLoading(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!booking) return
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id)

    if (!error) {
      setBooking({ ...booking, status: newStatus as BookingStatus })
    }
  }

  async function handleTimeEdit() {
    if (!booking) return
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({
        start_time: new Date(editStart).toISOString(),
        end_time: new Date(editEnd).toISOString(),
      })
      .eq('id', booking.id)

    if (!error) {
      setBooking({
        ...booking,
        start_time: new Date(editStart).toISOString(),
        end_time: new Date(editEnd).toISOString(),
      })
      setEditOpen(false)
    }
    setSaving(false)
  }

  async function handleSendMessage() {
    if (!booking || !user || !newMessage.trim()) return
    setSendingMessage(true)

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        client_id: booking.client_id,
        booking_id: booking.id,
        body: newMessage.trim(),
        is_internal: false,
      })
      .select('*, sender:profiles!sender_id(*)')
      .single()

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message])
      setNewMessage('')
    }
    setSendingMessage(false)
  }

  function formatDateTime(dt: string): string {
    const d = new Date(dt)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading booking...</div>
  }

  if (!booking) {
    return <div className="flex justify-center p-12 text-muted-foreground">Booking not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Booking Detail</h1>
          <p className="text-muted-foreground mt-1">ID: {booking.id}</p>
        </div>
        <Badge variant={statusVariant[booking.status]} className="text-sm px-3 py-1">
          {booking.status}
        </Badge>
      </div>

      {/* Booking info */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Time</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Total Amount</p>
              <p className="text-sm text-muted-foreground">
                {booking.total_amount != null ? `$${booking.total_amount.toFixed(2)}` : 'Not set'}
              </p>
            </div>
          </div>
          {booking.notes && (
            <div>
              <p className="text-sm font-medium">Internal Notes</p>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          )}
          {booking.client_notes && (
            <div>
              <p className="text-sm font-medium">Client Notes</p>
              <p className="text-sm text-muted-foreground">{booking.client_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client info */}
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="font-medium">Name:</span>{' '}
            {booking.client?.first_name} {booking.client?.last_name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {booking.client?.email}
          </p>
          {booking.client?.phone && (
            <p className="text-sm">
              <span className="font-medium">Phone:</span> {booking.client.phone}
            </p>
          )}
          {booking.client?.company && (
            <p className="text-sm">
              <span className="font-medium">Company:</span> {booking.client.company}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assigned resources */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Resources</CardTitle>
        </CardHeader>
        <CardContent>
          {booking.booking_resources && booking.booking_resources.length > 0 ? (
            <div className="space-y-2">
              {booking.booking_resources.map((br) => (
                <div key={br.id} className="flex items-center gap-3">
                  <Badge variant={resourceTypeVariant[br.resource?.resource_type ?? 'studio']}>
                    {br.resource?.resource_type}
                  </Badge>
                  <span className="text-sm">{br.resource?.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No resources assigned.</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Label>Change Status</Label>
            <Select value={booking.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit Time</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Booking Time</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                  />
                </div>
                <Button onClick={handleTimeEdit} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Linked invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice ? (
            <div className="flex items-center gap-4">
              <p className="text-sm">
                <span className="font-medium">Invoice #{invoice.invoice_number}</span>
                {' - '}
                <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                  {invoice.status}
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Total: ${invoice.total.toFixed(2)}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/invoices/${invoice.id}`}>View Invoice</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invoice linked to this booking.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">
                      {msg.sender?.first_name} {msg.sender?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                  <p className="text-sm">{msg.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendingMessage || !newMessage.trim()}
              className="self-end"
            >
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
