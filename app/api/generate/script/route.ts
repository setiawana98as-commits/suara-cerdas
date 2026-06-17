import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('sc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json()
  const { type } = body

  // Ambil Gemini key
  const { data: setting } = await supabaseAdmin.from('settings').select('value').eq('key','gemini_api_key').single()
  const geminiKey = setting?.value || process.env.GEMINI_API_KEY
  if (!geminiKey || geminiKey === 'placeholder') {
    return NextResponse.json({ error: 'Gemini API key belum dikonfigurasi di Pengaturan admin' }, { status: 500 })
  }

  const prompts: Record<string, string> = {
    podcast: `Buat script podcast ${body.format||'diskusi'} dalam bahasa Indonesia tentang: "${body.topic}". 
Durasi: ${body.duration||'sedang'}. Format wajib: setiap baris dimulai "Host1:" atau "Host2:". 
Buat natural dan menarik. Maksimal 600 kata. Langsung mulai scriptnya tanpa penjelasan.`,

    iklan: `Buat script iklan radio ${body.durasi||'30 detik'} dalam bahasa Indonesia untuk:
Produk: ${body.prodName}
Keunggulan: ${body.prodBenefit||'berkualitas tinggi'}
Target: ${body.prodTarget||'semua kalangan'}
CTA: ${body.prodCTA||'Hubungi kami sekarang'}
Gunakan teknik copywriting persuasif, emosional, dan langsung to the point. Hanya tulis script saja tanpa judul atau penjelasan.`,

    mc: `Buat script MC pembawa acara untuk ${body.acaraType} dalam bahasa Indonesia. 
150-200 kata. Natural, profesional, sesuai nuansa acara. Hanya script saja tanpa judul atau penjelasan.`,

    berita: `Format teks berita berikut menjadi bacaan berita yang natural untuk dibacakan oleh presenter ${body.newsStyle||'TV nasional'}:
"${body.newsText}"
Tambahkan intonasi natural, jeda yang tepat. Hanya tulis teks yang akan dibacakan saja.`,

    // Auto text generator untuk semua tema
    auto_iklan_produk: `Buat script iklan radio 30 detik dalam bahasa Indonesia untuk produk "${body.tema}". Persuasif dan menarik. Hanya script saja.`,
    auto_berita: `Buat 1 berita singkat fiktif dalam bahasa Indonesia tentang topik "${body.tema}". Format berita profesional. Hanya isi berita saja.`,
    auto_podcast: `Buat opening podcast menarik dalam bahasa Indonesia tentang "${body.tema}". Format: Host1: ... Host2: ... (3-4 giliran). Langsung mulai.`,
    auto_mc: `Buat script MC singkat untuk acara "${body.tema}" dalam bahasa Indonesia. 100 kata. Langsung script saja.`,
    auto_narasi: `Buat narasi audio pendek dalam bahasa Indonesia tentang "${body.tema}". 80-100 kata. Dramatis dan menarik. Langsung teksnya saja.`,
    auto_radio: `Buat script radio DJ energik dalam bahasa Indonesia untuk tema "${body.tema}". 50-70 kata. Langsung script saja.`,
    auto_promo: `Buat script promo flash sale untuk "${body.tema}" dalam bahasa Indonesia. Sangat antusias dan mengajak. 40-60 kata. Langsung script saja.`,
    auto_testimoni: `Buat testimoni pelanggan yang natural dan meyakinkan untuk "${body.tema}" dalam bahasa Indonesia. 60-80 kata. Langsung teksnya saja.`,
  }

  const prompt = prompts[type]
  if (!prompt) return NextResponse.json({ error: 'Type tidak dikenali' }, { status: 400 })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message || `API Error ${res.status}`)
    }
    const data = await res.json()
    const script = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ script })
  } catch(e: any) {
    return NextResponse.json({ error: 'Gagal generate script: ' + e.message }, { status: 500 })
  }
}
