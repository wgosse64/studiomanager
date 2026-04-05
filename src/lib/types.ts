// ============================================================
// Roles & Enums
// ============================================================

export type UserRole = 'admin' | 'staff' | 'client'
export type ResourceType = 'studio' | 'engineer' | 'equipment'
export type BookingStatus = 'requested' | 'confirmed' | 'cancelled' | 'completed'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed'
export type PaymentMethod = 'card' | 'cash' | 'check' | 'bank_transfer'
export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'needs_repair'

// ============================================================
// Core Tables
// ============================================================

export interface Profile {
  id: string
  role: UserRole
  first_name: string
  last_name: string
  email: string
  phone: string | null
  company: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  resource_type: ResourceType
  name: string
  description: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  // Joined type-specific detail (one of these will be present)
  studios?: StudioDetail
  engineers?: EngineerDetail
  equipment?: EquipmentDetail
}

export interface StudioDetail {
  id: string
  resource_id: string
  is_soundproofed: boolean
  capacity: number
  hourly_rate: number
  half_day_rate: number | null
  full_day_rate: number | null
  created_at: string
  updated_at: string
}

export interface StudioFeature {
  id: string
  studio_id: string
  feature_name: string
  description: string | null
}

export interface EngineerDetail {
  id: string
  resource_id: string
  user_id: string | null
  specialties: string[]
  hourly_rate: number | null
  created_at: string
  updated_at: string
}

export interface EquipmentDetail {
  id: string
  resource_id: string
  category: string
  serial_number: string
  purchase_price: number | null
  purchase_date: string | null
  condition: EquipmentCondition
  default_studio_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Bookings
// ============================================================

export interface Booking {
  id: string
  client_id: string
  booked_by: string
  start_time: string
  end_time: string
  status: BookingStatus
  total_amount: number | null
  notes: string | null
  client_notes: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: Profile
  booked_by_profile?: Profile
  booking_resources?: BookingResource[]
}

export interface BookingResource {
  id: string
  booking_id: string
  resource_id: string
  time_range: string
  created_at: string
  // Joined
  resource?: Resource
}

// ============================================================
// Invoicing & Payments
// ============================================================

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  created_by: string
  status: InvoiceStatus
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  stripe_invoice_id: string | null
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: Profile
  line_items?: InvoiceLineItem[]
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  booking_id: string | null
  description: string
  quantity: number
  unit_price: number
  amount: number
  created_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod
  stripe_payment_intent_id: string | null
  stripe_refund_id: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Files & Messages
// ============================================================

export interface FileRecord {
  id: string
  uploaded_by: string
  booking_id: string | null
  client_id: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  label: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  uploader?: Profile
}

export interface Message {
  id: string
  sender_id: string
  client_id: string
  booking_id: string | null
  parent_id: string | null
  body: string
  is_internal: boolean
  created_at: string
  updated_at: string
  // Joined
  sender?: Profile
}
