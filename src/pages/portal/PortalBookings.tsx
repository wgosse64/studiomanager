import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Booking } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  confirmed: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

export function PortalBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('bookings')
      .select('*')
      .eq('client_id', user.id)
      .order('start_time', { ascending: false })
      .then(({ data }) => {
        setBookings(data ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading bookings...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <Button asChild>
          <Link to="/portal/studios">Book a Session</Link>
        </Button>
      </div>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground">No bookings yet.</p>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <Link key={b.id} to={`/portal/bookings/${b.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {new Date(b.start_time).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {' - '}
                      {new Date(b.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    {b.client_notes && (
                      <p className="text-sm text-muted-foreground mt-1">{b.client_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {b.total_amount && <span className="text-sm font-medium">${b.total_amount}</span>}
                    <Badge variant={statusColors[b.status]}>{b.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
