import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Invoice, InvoiceStatus, Payment } from '@/lib/types'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const statusVariant: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  paid: 'default',
  overdue: 'destructive',
  void: 'secondary',
}

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [paymentNotes, setPaymentNotes] = useState('')

  useEffect(() => {
    async function load() {
      if (!user || !id) return

      const [invoiceRes, paymentsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, client:profiles!client_id(*), line_items:invoice_line_items(*)')
          .eq('id', id)
          .single(),
        supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', id)
          .order('created_at', { ascending: false }),
      ])

      setInvoice((invoiceRes.data as Invoice) ?? null)
      setPayments((paymentsRes.data as Payment[]) ?? [])
      setLoading(false)
    }
    load()
  }, [user, id])

  async function updateStatus(newStatus: InvoiceStatus) {
    if (!invoice) return
    setUpdating(true)
    const { error } = await supabase
      .from('invoices')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', invoice.id)
    if (!error) {
      setInvoice({ ...invoice, status: newStatus })
    }
    setUpdating(false)
  }

  async function handleMarkPaid() {
    if (!invoice) return
    setUpdating(true)

    const amount = parseFloat(paymentAmount) || invoice.total
    const { error: paymentError } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount,
      currency: 'usd',
      status: 'paid',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
      notes: paymentNotes || null,
    })

    if (!paymentError) {
      await supabase
        .from('invoices')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', invoice.id)

      setInvoice({ ...invoice, status: 'paid' })

      const { data: updatedPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false })
      setPayments((updatedPayments as Payment[]) ?? [])
    }

    setPaymentDialogOpen(false)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNotes('')
    setUpdating(false)
  }

  if (loading) {
    return <div className="flex justify-center p-12 text-muted-foreground">Loading invoice...</div>
  }

  if (!invoice) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </Button>
      </div>
    )
  }

  const lineItems = invoice.line_items ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/invoices">Back to Invoices</Link>
        </Button>
      </div>

      {/* Invoice Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{invoice.invoice_number}</CardTitle>
              <p className="text-muted-foreground mt-1">
                {invoice.client
                  ? `${invoice.client.first_name} ${invoice.client.last_name}`
                  : 'Unknown client'}
                {invoice.client?.company && ` - ${invoice.client.company}`}
              </p>
            </div>
            <Badge variant={statusVariant[invoice.status]} className="text-sm">
              {invoice.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Created:</span>{' '}
              {new Date(invoice.created_at).toLocaleDateString()}
            </div>
            {invoice.due_date && (
              <div>
                <span className="font-medium text-foreground">Due:</span>{' '}
                {new Date(invoice.due_date).toLocaleDateString()}
              </div>
            )}
          </div>
          {invoice.notes && (
            <p className="mt-4 text-sm text-muted-foreground">{invoice.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {lineItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No line items
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="flex flex-col items-end gap-2 text-sm">
            <div className="flex justify-between w-48">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-48">
              <span className="text-muted-foreground">
                Tax ({(invoice.tax_rate * 100).toFixed(1)}%):
              </span>
              <span>${invoice.tax_amount.toFixed(2)}</span>
            </div>
            <Separator className="w-48" />
            <div className="flex justify-between w-48 font-semibold text-base">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/invoices/${invoice.id}/edit`}>Edit</Link>
              </Button>
              <Button disabled={updating} onClick={() => updateStatus('sent')}>
                Send Invoice
              </Button>
            </>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              disabled={updating}
              onClick={() => {
                setPaymentAmount(invoice.total.toFixed(2))
                setPaymentDialogOpen(true)
              }}
            >
              Mark Paid
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button variant="destructive" disabled={updating} onClick={() => updateStatus('void')}>
              Void
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString()
                        : new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${payment.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.notes ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mark Paid Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a cash or check payment for {invoice.invoice_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={updating} onClick={handleMarkPaid}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
