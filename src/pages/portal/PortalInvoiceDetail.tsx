import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceLineItem } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function PortalInvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('invoices').select('*').eq('id', id).single(),
      supabase.from('invoice_line_items').select('*').eq('invoice_id', id).order('created_at'),
    ]).then(([invRes, liRes]) => {
      setInvoice(invRes.data)
      setLineItems(liRes.data ?? [])
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading...</div>
  }

  if (!invoice) {
    return <div className="flex justify-center p-12 text-muted-foreground">Invoice not found.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
          {invoice.due_date && (
            <p className="text-sm text-muted-foreground">
              Due {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <Badge
          variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}
          className="text-sm"
        >
          {invoice.status}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardContent className="py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map(li => (
                <TableRow key={li.id}>
                  <TableCell>{li.description}</TableCell>
                  <TableCell className="text-right">{li.quantity}</TableCell>
                  <TableCell className="text-right">${li.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${li.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="space-y-1 text-right">
            <p className="text-sm">Subtotal: <span className="font-medium">${invoice.subtotal.toFixed(2)}</span></p>
            {invoice.tax_amount > 0 && (
              <p className="text-sm">
                Tax ({(invoice.tax_rate * 100).toFixed(2)}%): <span className="font-medium">${invoice.tax_amount.toFixed(2)}</span>
              </p>
            )}
            <p className="text-lg font-bold">Total: ${invoice.total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {(invoice.status === 'sent' || invoice.status === 'overdue') && invoice.stripe_invoice_id && (
        <Button className="w-full" size="lg">
          Pay Now
        </Button>
      )}
    </div>
  )
}
