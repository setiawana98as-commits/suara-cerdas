import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get('sc_token')?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'admin') return null
  return payload
}

// GET: Dashboard stats + daftar member/order
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'stats'

  if (type === 'stats') {
    const [usersRes, ordersRes, logsRes] = await Promise.all([
      supabaseAdmin.from('users').select('status, created_at, role'),
      supabaseAdmin.from('orders').select('status, amount, created_at'),
      supabaseAdmin.from('usage_logs').select('feature, status, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    const users = (usersRes.data || []) as Array<{ status: string; created_at: string; role: string }>
    const orders = (ordersRes.data || []) as Array<{ status: string; amount: number; created_at: string }>
    const logs = (logsRes.data || []) as Array<{ feature: string; status: string; created_at: string }>

    const stats = {
      totalMembers: users.filter(u => u.role === 'member').length,
      activeMembers: users.filter(u => u.status === 'active').length,
      pendingMembers: users.filter(u => u.status === 'pending').length,
      totalRevenue: orders.filter(o => o.status === 'confirmed').reduce((s, o) => s + o.amount, 0),
      pendingPayments: orders.filter(o => o.status === 'paid').length,
      monthlyGenerates: logs.filter(l => l.status === 'success').length,
      newMembersToday: users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length,
    }

    return NextResponse.json({ stats })
  }

  if (type === 'members') {
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const limit = 20

    let query = supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, status, is_lifetime, daily_quota, daily_used, created_at, last_login_at, role')
      .eq('role', 'member')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (search) query = query.ilike('email', `%${search}%`)
    if (status) query = query.eq('status', status)

    const { data, count } = await query
    return NextResponse.json({ members: data || [], total: count || 0 })
  }

  if (type === 'settings') {
    const { data } = await supabaseAdmin.from('settings').select('key, value')
    const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]))
    return NextResponse.json({ settings })
  }

  if (type === 'orders') {
    const status = searchParams.get('status') || 'paid'
    const { data } = await supabaseAdmin
      .from('orders')
      .select(`*, users(email, full_name, phone)`)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({ orders: data || [] })
  }

  return NextResponse.json({ error: 'Type tidak valid' }, { status: 400 })
}

// POST: Aksi admin (konfirmasi bayar, suspend, aktifkan, dll)
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, userId, orderId, data: bodyData } = await req.json()

  if (action === 'confirm_payment') {
    // Konfirmasi pembayaran → aktifkan member
    const { error: orderErr } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        confirmed_by: admin.userId,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderErr) return NextResponse.json({ error: 'Gagal update order' }, { status: 500 })

    // Aktifkan user
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .update({ status: 'active', is_lifetime: true })
      .eq('id', userId)

    if (userErr) return NextResponse.json({ error: 'Gagal aktifkan user' }, { status: 500 })

    // Kirim notifikasi
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Pembayaran Dikonfirmasi!',
      message: 'Selamat! Akun Suara Cerdas Anda telah aktif. Nikmati semua fitur tanpa batas!',
      type: 'success'
    })

    return NextResponse.json({ success: true, message: 'Pembayaran dikonfirmasi, akun diaktifkan' })
  }

  if (action === 'reject_payment') {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'rejected', rejected_reason: bodyData?.reason || 'Bukti transfer tidak valid' })
      .eq('id', orderId)

    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title: 'Pembayaran Ditolak',
      message: `Pembayaran Anda ditolak. Alasan: ${bodyData?.reason || 'Bukti transfer tidak valid'}. Silakan hubungi admin.`,
      type: 'error'
    })

    return NextResponse.json({ success: true })
  }

  if (action === 'suspend_user') {
    await supabaseAdmin
      .from('users')
      .update({ status: 'suspended', notes: bodyData?.reason })
      .eq('id', userId)
    return NextResponse.json({ success: true })
  }

  if (action === 'activate_user') {
    await supabaseAdmin
      .from('users')
      .update({ status: 'active' })
      .eq('id', userId)
    return NextResponse.json({ success: true })
  }

  if (action === 'set_quota') {
    await supabaseAdmin
      .from('users')
      .update({ daily_quota: bodyData?.quota })
      .eq('id', userId)
    return NextResponse.json({ success: true })
  }

  if (action === 'update_settings') {
    for (const [key, value] of Object.entries(bodyData || {})) {
      await supabaseAdmin
        .from('settings')
        .update({ value: String(value), updated_at: new Date().toISOString() })
        .eq('key', key)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action tidak dikenali' }, { status: 400 })
}
// Handler sudah ada di GET, tambahkan type=settings di bawah type=orders
