import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const statusVariant: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  paid: 'default',
  overdue: 'destructive',
  void: 'secondary',
}

const ALL_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'void']

export function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  useEffect(() => {
    async function load() {
      if (!user) return

      let query = supabase
        .from('invoices')
        .select('*, client:profiles!client_id(*)')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      setInvoices((data as Invoice[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user, statusFilter])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading invoices...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as InvoiceStatus | 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/invoices/new">New Invoice</Link>
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted-foreground">No invoices found.</p>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Link key={invoice.id} to={`/invoices/${invoice.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{invoice.invoice_number}</CardTitle>
                    <Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {invoice.client
                        ? `${invoice.client.first_name} ${invoice.client.last_name}`
                        : 'Unknown client'}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-foreground">
                        ${invoice.total.toFixed(2)}
                      </span>
                      {invoice.due_date && (
                        <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      )}
                      <span>
                        Created: {new Date(invoice.created_at).toLocaleDateString()}
                      </span>
                    </div>
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
