export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Order, 'id'>>
      }
      usage_logs: {
        Row: UsageLog
        Insert: Omit<UsageLog, 'id' | 'created_at'>
        Update: never
      }
      settings: {
        Row: Setting
        Insert: Setting
        Update: Partial<Setting>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id'>>
      }
    }
  }
}

export interface User {
  id: string
  email: string
  password_hash: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: 'member' | 'admin'
  status: 'pending' | 'active' | 'suspended' | 'expired'
  is_lifetime: boolean
  daily_quota: number
  daily_used: number
  quota_reset_at: string
  referral_code: string | null
  referred_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  amount: number
  payment_method: 'transfer' | 'qris' | 'ewallet'
  bank_name: string | null
  transfer_proof_url: string | null
  status: 'pending' | 'paid' | 'confirmed' | 'rejected' | 'refunded'
  confirmed_by: string | null
  confirmed_at: string | null
  rejected_reason: string | null
  product_name: string
  product_type: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UsageLog {
  id: string
  user_id: string | null
  feature: string
  voice_used: string | null
  char_count: number
  duration_ms: number | null
  status: 'success' | 'error' | 'quota_exceeded'
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
}
