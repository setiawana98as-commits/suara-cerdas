import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export default async function Home() {
  const token = cookies().get('sc_token')?.value
  if (token) {
    const payload = await verifyToken(token)
    if (payload) {
      redirect(payload.role === 'admin' ? '/admin' : '/dashboard')
    }
  }
  redirect('/auth/login')
}
