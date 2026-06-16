import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'suara-cerdas-secret-key-ganti-ini')
const COOKIE_NAME = 'sc_token'

export interface JWTPayload {
  userId: string
  email: string
  role: 'member' | 'admin'
  iat?: number
  exp?: number
}

// Buat JWT token
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET)
}

// Verifikasi JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// Ambil user dari cookie (server side)
export async function getCurrentUser() {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .single()

  if (!user || user.status === 'suspended') return null
  return user
}

// Cek kuota harian
export async function checkAndIncrementQuota(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('daily_used, daily_quota, quota_reset_at')
    .eq('id', userId)
    .single()

  if (!user) return { allowed: false, used: 0, limit: 0 }

  // Reset jika sudah > 24 jam
  const resetAt = new Date(user.quota_reset_at)
  const now = new Date()
  const diffHours = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60)

  let currentUsed = user.daily_used
  if (diffHours >= 24) {
    currentUsed = 0
    await supabaseAdmin
      .from('users')
      .update({ daily_used: 0, quota_reset_at: now.toISOString() })
      .eq('id', userId)
  }

  if (currentUsed >= user.daily_quota) {
    return { allowed: false, used: currentUsed, limit: user.daily_quota }
  }

  // Increment
  await supabaseAdmin
    .from('users')
    .update({ daily_used: currentUsed + 1 })
    .eq('id', userId)

  return { allowed: true, used: currentUsed + 1, limit: user.daily_quota }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verifikasi password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Set cookie
export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
    path: '/'
  })
}

// Clear cookie
export function clearAuthCookie() {
  cookies().delete(COOKIE_NAME)
}
