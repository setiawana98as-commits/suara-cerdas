-- =============================================
-- STEP 1: Jalankan schema utama dulu
-- (isi dari file supabase-schema.sql)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  daily_quota INTEGER DEFAULT 25,
  daily_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
  referral_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  referred_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL DEFAULT 'SC-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 89000,
  payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'qris', 'ewallet')),
  bank_name TEXT,
  transfer_proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'rejected', 'refunded')),
  confirmed_by UUID REFERENCES public.users(id),
  confirmed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  product_name TEXT DEFAULT 'Suara Cerdas Lifetime',
  product_type TEXT DEFAULT 'lifetime',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  voice_used TEXT,
  char_count INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'quota_exceeded')),
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);

-- Auto update timestamp
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

-- Reset kuota harian
CREATE OR REPLACE FUNCTION reset_daily_quota()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET daily_used = 0, quota_reset_at = NOW()
  WHERE quota_reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true);
CREATE POLICY "allow_all_orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "allow_all_logs" ON public.usage_logs FOR ALL USING (true);
CREATE POLICY "allow_all_notif" ON public.notifications FOR ALL USING (true);

-- =============================================
-- STEP 2: Settings default
-- =============================================
INSERT INTO public.settings (key, value, description) VALUES
  ('harga_lifetime', '89000', 'Harga produk lifetime dalam Rupiah'),
  ('bank_name', 'BCA', 'Nama bank untuk transfer'),
  ('bank_account', '7370303210', 'Nomor rekening'),
  ('bank_holder', 'Ary Setiawan', 'Nama pemilik rekening'),
  ('daily_quota_default', '25', 'Kuota generate per hari untuk member baru'),
  ('gemini_api_key', '', 'Gemini API Key'),
  ('app_name', 'Suara Cerdas', 'Nama aplikasi'),
  ('app_url', 'https://suara-cerdas.vercel.app', 'URL aplikasi'),
  ('admin_email', 'admin@suaracerdas.com', 'Email admin'),
  ('whatsapp_admin', '6285764189033', 'WA admin untuk konfirmasi pembayaran'),
  ('maintenance_mode', 'false', 'Mode maintenance')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =============================================
-- STEP 3: Akun Admin
-- Password: Admin123! (GANTI SETELAH LOGIN PERTAMA)
-- =============================================
INSERT INTO public.users (
  email, password_hash, full_name, phone,
  role, status, is_lifetime, daily_quota
) VALUES (
  'admin@suaracerdas.com',
  '$2b$10$V5zvYwyBlPMi0yR.HKhxrOkLRURz94Z58X85kxyG3IVyKe7m/OQ8i',
  'Ary Setiawan',
  '6285764189033',
  'admin',
  'active',
  true,
  9999
) ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  status = 'active',
  role = 'admin';

-- Verifikasi
SELECT email, role, status, full_name FROM public.users WHERE role = 'admin';
SELECT key, value FROM public.settings WHERE key IN ('bank_name','bank_account','whatsapp_admin','harga_lifetime');
