import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('sc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, role, status, is_lifetime, daily_quota, daily_used, quota_reset_at, referral_code, created_at')
    .eq('id', payload.userId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Cek apakah perlu reset kuota
  const resetAt = new Date(user.quota_reset_at)
  const diffHours = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60)
  const effectiveUsed = diffHours >= 24 ? 0 : user.daily_used

  // Ambil notifikasi belum dibaca
  const { data: notifs } = await supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, is_read, created_at')
    .eq('user_id', user.id)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
      isLifetime: user.is_lifetime,
      dailyQuota: user.daily_quota,
      dailyUsed: effectiveUsed,
      referralCode: user.referral_code,
      memberSince: user.created_at,
    },
    notifications: notifs || []
  })
}
