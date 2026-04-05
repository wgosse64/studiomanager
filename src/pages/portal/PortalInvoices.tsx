import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Invoice } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  paid: 'default',
  overdue: 'destructive',
  void: 'outline',
}

export function PortalInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('invoices')
      .select('*')
      .eq('client_id', user.id)
      .neq('status', 'draft') // Clients don't see drafts
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setInvoices(data ?? [])
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading invoices...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Invoices</h1>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <Link key={inv.id} to={`/portal/invoices/${inv.id}`}>
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {inv.due_date
                        ? `Due ${new Date(inv.due_date).toLocaleDateString()}`
                        : `Created ${new Date(inv.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${inv.total.toFixed(2)}</span>
                    <Badge variant={statusColors[inv.status]}>{inv.status}</Badge>
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
