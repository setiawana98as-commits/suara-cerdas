import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signToken, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })
    }

    // Cari user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    // Cek password
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    // Cek status akun
    if (user.status === 'pending') {
      return NextResponse.json({
        error: 'Akun Anda menunggu konfirmasi pembayaran. Silakan upload bukti transfer.'
      }, { status: 403 })
    }

    if (user.status === 'suspended') {
      return NextResponse.json({ error: 'Akun Anda telah disuspend. Hubungi admin.' }, { status: 403 })
    }

    // Buat token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'member' | 'admin'
    })

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        dailyQuota: user.daily_quota,
        dailyUsed: user.daily_used
      }
    })

    response.cookies.set('sc_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    })

    return response

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
