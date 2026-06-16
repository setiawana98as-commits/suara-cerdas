import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, phone, referralCode } = await req.json()

    // Validasi
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 })
    }

    // Cek email sudah ada
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
    }

    // Cek referral code (opsional)
    let referredBy = null
    if (referralCode) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', referralCode.toUpperCase())
        .single()
      if (referrer) referredBy = referrer.id
    }

    // Ambil daily quota default dari settings
    const { data: quotaSetting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'daily_quota_default')
      .single()
    const dailyQuota = parseInt(quotaSetting?.value || '25')

    // Buat user
    const passwordHash = await hashPassword(password)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        role: 'member',
        status: 'pending',  // Harus bayar dulu
        is_lifetime: false,
        daily_quota: dailyQuota,
        daily_used: 0,
        referred_by: referredBy
      })
      .select()
      .single()

    if (error) {
      console.error('Register error:', error)
      return NextResponse.json({ error: 'Gagal membuat akun' }, { status: 500 })
    }

    // Ambil info bank dari settings
    const { data: bankSettings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['bank_name', 'bank_account', 'bank_holder', 'harga_lifetime', 'whatsapp_admin'])

    const bankInfo = Object.fromEntries(bankSettings?.map(s => [s.key, s.value]) || [])

    // Buat order pending
    await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        amount: parseInt(bankInfo.harga_lifetime || '89000'),
        payment_method: 'transfer',
        status: 'pending',
        product_name: 'Suara Cerdas Lifetime',
        product_type: 'lifetime'
      })

    return NextResponse.json({
      success: true,
      message: 'Akun berhasil dibuat! Silakan lakukan pembayaran untuk mengaktifkan akun.',
      userId: user.id,
      bankInfo
    })

  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
