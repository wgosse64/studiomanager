import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Message } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'

export function PortalMessages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadMessages() {
    if (!user) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(first_name, last_name, role)')
      .eq('client_id', user.id)
      .eq('is_internal', false)
      .is('booking_id', null) // General messages only (not booking-specific)
      .order('created_at')
    setMessages(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadMessages() }, [user])

  // Real-time
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('portal-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${user.id}`,
      }, () => loadMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newMessage.trim()) return
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: user.id,
      client_id: user.id,
      body: newMessage.trim(),
      is_internal: false,
    })

    setNewMessage('')
    setSending(false)
    loadMessages()
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading messages...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <Card>
        <CardContent className="py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">
              No messages yet. Send a message to the studio team below.
            </p>
          ) : (
            <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto">
              {messages.map(msg => {
                const sender = msg.sender as unknown as { first_name: string; last_name: string; role: string } | undefined
                const isOwn = msg.sender_id === user?.id
                return (
                  <div key={msg.id} className={`p-3 rounded-lg ${isOwn ? 'bg-primary/5 ml-8' : 'bg-muted mr-8'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {isOwn ? 'You' : sender ? `${sender.first_name} ${sender.last_name}` : 'Studio Team'}
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
