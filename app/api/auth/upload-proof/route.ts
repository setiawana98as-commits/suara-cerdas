import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sc_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload) return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('proof') as File
    const orderId = formData.get('orderId') as string
    const bankName = formData.get('bankName') as string

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // Validasi file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format file harus JPG atau PNG' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 })
    }

    // Upload ke Supabase Storage
    const fileName = `proof_${payload.userId}_${Date.now()}.${file.name.split('.').pop()}`
    const buffer = await file.arrayBuffer()

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('transfer-proofs')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Gagal upload file' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('transfer-proofs')
      .getPublicUrl(fileName)

    // Update order
    const updateData: Record<string, string> = {
      status: 'paid',
      transfer_proof_url: publicUrl,
    }
    if (bankName) updateData.bank_name = bankName

    let query = supabaseAdmin.from('orders').update(updateData)

    if (orderId) {
      query = query.eq('id', orderId)
    } else {
      query = query.eq('user_id', payload.userId).eq('status', 'pending')
    }

    const { error: orderError } = await query

    if (orderError) {
      return NextResponse.json({ error: 'Gagal update order' }, { status: 500 })
    }

    // Notif ke admin (via settings WA)
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('key, value')
      .in('key', ['whatsapp_admin', 'app_name'])

    const cfg = Object.fromEntries(settings?.map(s => [s.key, s.value]) || [])

    return NextResponse.json({
      success: true,
      message: 'Bukti transfer berhasil diupload. Admin akan mengkonfirmasi dalam 1x24 jam.',
      proofUrl: publicUrl,
      whatsappAdmin: cfg.whatsapp_admin
    })

  } catch (err) {
    console.error('Upload proof error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
