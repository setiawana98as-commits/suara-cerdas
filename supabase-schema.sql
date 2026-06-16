-- =============================================
-- SUARA CERDAS - Database Schema
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABEL USERS (member)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'expired')),
  is_lifetime BOOLEAN DEFAULT false,
  
  -- Kuota
  daily_quota INTEGER DEFAULT 25,
  daily_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  referral_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  referred_by UUID REFERENCES public.users(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- =============================================
-- TABEL ORDERS (pembayaran manual)
-- =============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL DEFAULT 'SC-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Detail pembayaran
  amount INTEGER NOT NULL DEFAULT 89000,
  payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'qris', 'ewallet')),
  bank_name TEXT,
  transfer_proof_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'rejected', 'refunded')),
  confirmed_by UUID REFERENCES public.users(id),
  confirmed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  
  -- Produk
  product_name TEXT DEFAULT 'Suara Cerdas Lifetime',
  product_type TEXT DEFAULT 'lifetime',
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABEL USAGE LOGS (tracking penggunaan)
-- =============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  feature TEXT NOT NULL,  -- 'tts', 'podcast', 'iklan', 'berita', 'mc'
  voice_used TEXT,
  char_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'quota_exceeded')),
  error_message TEXT,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABEL SETTINGS (konfigurasi app)
-- =============================================
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
  ('harga_lifetime', '89000', 'Harga produk lifetime dalam Rupiah'),
  ('bank_name', 'BCA', 'Nama bank untuk transfer'),
  ('bank_account', '1234567890', 'Nomor rekening'),
  ('bank_holder', 'Suara Cerdas Indonesia', 'Nama pemilik rekening'),
  ('daily_quota_default', '25', 'Kuota generate per hari untuk member baru'),
  ('gemini_api_key', '', 'Gemini API Key (disimpan terenkripsi)'),
  ('app_name', 'Suara Cerdas', 'Nama aplikasi'),
  ('app_url', 'https://suaracerdas.com', 'URL aplikasi'),
  ('admin_email', 'admin@suaracerdas.com', 'Email admin untuk notifikasi'),
  ('whatsapp_admin', '628xxx', 'WA admin untuk konfirmasi pembayaran'),
  ('maintenance_mode', 'false', 'Mode maintenance')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- TABEL NOTIFICATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES untuk performa
-- =============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);

-- =============================================
-- FUNCTION: Reset kuota harian otomatis
-- =============================================
CREATE OR REPLACE FUNCTION reset_daily_quota()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET daily_used = 0,
      quota_reset_at = NOW()
  WHERE quota_reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update updated_at otomatis
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- RLS (Row Level Security)
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users: hanya bisa lihat data sendiri (kecuali admin)
CREATE POLICY "users_own_data" ON public.users
  FOR ALL USING (true);  -- Kita handle di aplikasi level

CREATE POLICY "orders_own_data" ON public.orders
  FOR ALL USING (true);

CREATE POLICY "logs_own_data" ON public.usage_logs
  FOR ALL USING (true);

CREATE POLICY "notif_own_data" ON public.notifications
  FOR ALL USING (true);

-- =============================================
-- INSERT admin default (GANTI PASSWORD!)
-- =============================================
-- Password: Admin123! (ganti setelah deploy)
INSERT INTO public.users (email, password_hash, full_name, role, status, is_lifetime, daily_quota)
VALUES (
  'admin@suaracerdas.com',
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', -- ganti dengan hash bcrypt
  'Admin Suara Cerdas',
  'admin',
  'active',
  true,
  9999
) ON CONFLICT (email) DO NOTHING;
