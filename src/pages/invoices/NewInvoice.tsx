import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Profile, Booking } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LineItemDraft {
  key: string
  description: string
  quantity: number
  unit_price: number
  booking_id: string | null
}

function generateKey() {
  return Math.random().toString(36).slice(2, 10)
}

function emptyLineItem(): LineItemDraft {
  return {
    key: generateKey(),
    description: '',
    quantity: 1,
    unit_price: 0,
    booking_id: null,
  }
}

export function NewInvoice() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [clients, setClients] = useState<Profile[]>([])
  const [clientId, setClientId] = useState('')
  const [clientBookings, setClientBookings] = useState<Booking[]>([])
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([emptyLineItem()])
  const [dueDate, setDueDate] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load clients
  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .eq('is_active', true)
        .order('last_name')
      setClients((data as Profile[]) ?? [])
    }
    loadClients()
  }, [])

  // Load client bookings when client changes
  useEffect(() => {
    async function loadBookings() {
      if (!clientId) {
        setClientBookings([])
        return
      }
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: false })
      setClientBookings((data as Booking[]) ?? [])
    }
    loadBookings()
  }, [clientId])

  function updateLineItem(key: string, field: keyof LineItemDraft, value: string | number | null) {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    )
  }

  function removeLineItem(key: string) {
    setLineItems((prev) => {
      const filtered = prev.filter((item) => item.key !== key)
      return filtered.length === 0 ? [emptyLineItem()] : filtered
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, emptyLineItem()])
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxRateNum = parseFloat(taxRate) / 100 || 0
  const taxAmount = subtotal * taxRateNum
  const total = subtotal + taxAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !clientId) return
    setError(null)
    setSubmitting(true)

    try {
      // Generate invoice number
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
      const sequence = (count ?? 0) + 1
      const invoiceNumber = `INV-${year}-${String(sequence).padStart(4, '0')}`

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_id: clientId,
          created_by: user.id,
          status: 'draft',
          due_date: dueDate || null,
          subtotal,
          tax_rate: taxRateNum,
          tax_amount: taxAmount,
          total,
          notes: notes || null,
        })
        .select()
        .single()

      if (invoiceError || !invoice) {
        throw new Error(invoiceError?.message ?? 'Failed to create invoice')
      }

      // Insert line items
      const validItems = lineItems.filter((item) => item.description && item.quantity > 0)
      if (validItems.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_line_items').insert(
          validItems.map((item) => ({
            invoice_id: invoice.id,
            booking_id: item.booking_id || null,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
          }))
        )
        if (itemsError) {
          throw new Error(itemsError.message)
        }
      }

      navigate(`/invoices/${invoice.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">New Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="client">Select Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                      {client.company ? ` (${client.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Description</TableHead>
                  <TableHead className="w-[20%]">Booking</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.key, 'description', e.target.value)}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.booking_id ?? 'none'}
                        onValueChange={(v) =>
                          updateLineItem(item.key, 'booking_id', v === 'none' ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clientBookings.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {new Date(b.start_time).toLocaleDateString()} -{' '}
                              {b.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        className="text-right"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.key, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(item.key, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        required
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.quantity * item.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.key)}
                      >
                        X
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button type="button" variant="outline" className="mt-4" onClick={addLineItem}>
              Add Line Item
            </Button>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible to client..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-end gap-2 text-sm">
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48">
                <span className="text-muted-foreground">
                  Tax ({(taxRateNum * 100).toFixed(1)}%):
                </span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <Separator className="w-48" />
              <div className="flex justify-between w-48 font-semibold text-base">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !clientId}>
            {submitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
