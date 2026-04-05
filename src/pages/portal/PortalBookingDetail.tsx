import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Booking, BookingResource, Resource, Message, FileRecord } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  confirmed: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

export function PortalBookingDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [resources, setResources] = useState<(BookingResource & { resource: Resource })[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileRecord[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadData() {
    if (!id) return
    const [bookingRes, brRes, msgRes, filesRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', id).single(),
      supabase.from('booking_resources').select('*, resource:resources(*)').eq('booking_id', id),
      supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(first_name, last_name, role)')
        .eq('booking_id', id).eq('is_internal', false).order('created_at'),
      supabase.from('files').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    ])

    setBooking(bookingRes.data)
    setResources(brRes.data ?? [])
    setMessages(msgRes.data ?? [])
    setFiles(filesRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  // Real-time messages
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`booking-messages-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${id}` }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !id || !newMessage.trim()) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: user.id,
      client_id: user.id,
      booking_id: id,
      body: newMessage.trim(),
      is_internal: false,
    })

    setNewMessage('')
    setSending(false)
    loadData()
  }

  async function cancelBooking() {
    if (!booking || !confirm('Are you sure you want to cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    loadData()
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!booking) {
    return <div className="flex justify-center p-12 text-muted-foreground">Booking not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Booking Details</h1>
        <Badge variant={statusColors[booking.status]} className="text-sm">
          {booking.status}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {new Date(booking.start_time).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {' - '}
                {new Date(booking.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {booking.total_amount && (
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-medium">${booking.total_amount}</p>
            </div>
          )}

          {resources.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Resources</p>
              <div className="flex flex-wrap gap-2">
                {resources.map(br => (
                  <Badge key={br.id} variant="secondary">
                    {br.resource?.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {booking.client_notes && (
            <div>
              <p className="text-sm text-muted-foreground">Your Notes</p>
              <p className="text-sm">{booking.client_notes}</p>
            </div>
          )}

          {booking.status === 'requested' && (
            <Button variant="destructive" size="sm" onClick={cancelBooking}>
              Cancel Request
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Files */}
      {files.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Files</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    {file.label && <Badge variant="outline" className="text-xs">{file.label}</Badge>}
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const { data } = await supabase.storage.from('shared-files').createSignedUrl(file.file_path, 3600)
                    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                  }}>
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Messages</CardTitle></CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">No messages yet.</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {messages.map(msg => {
                const sender = msg.sender as unknown as { first_name: string; last_name: string; role: string } | undefined
                const isOwn = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`p-3 rounded-lg ${isOwn ? 'bg-primary/5 ml-8' : 'bg-muted mr-8'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{msg.body}</p>
                  </div>
                )
              })}
            </div>
          )}

          <Separator className="my-4" />

          <form onSubmit={sendMessage} className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              rows={2}
            />
            <Button type="submit" disabled={sending || !newMessage.trim()}>
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
