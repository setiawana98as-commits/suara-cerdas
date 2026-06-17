import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('sc_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { type, topic, duration, format, acaraType,
          prodName, prodBenefit, prodTarget, prodCTA, durasi } = await req.json()

  const { data: setting } = await supabaseAdmin.from('settings').select('value').eq('key','gemini_api_key').single()
  const geminiKey = setting?.value || process.env.GEMINI_API_KEY
  if (!geminiKey) return NextResponse.json({ error: 'Gemini API key belum dikonfigurasi' }, { status: 500 })

  let prompt = ''
  if (type === 'podcast') {
    const formats: Record<string,string> = { diskusi:'Diskusi Santai', interview:'Interview', edukasi:'Edukasi', berita:'Review Berita' }
    const durations: Record<string,string> = { pendek:'2-3 menit', sedang:'5-7 menit', panjang:'10-15 menit' }
    prompt = `Buat script podcast ${formats[format]||'diskusi'} dalam bahasa Indonesia tentang: "${topic}". Durasi target: ${durations[duration]||'5-7 menit'}. 
Format: setiap baris dimulai "Host1:" atau "Host2:". Buat natural dan menarik. Maksimal 800 kata.`
  } else if (type === 'iklan') {
    prompt = `Buat script iklan radio ${durasi||'30 detik'} dalam bahasa Indonesia untuk:
Nama produk: ${prodName}
Keunggulan: ${prodBenefit||'-'}
Target pasar: ${prodTarget||'umum'}
Call to action: ${prodCTA||'Hubungi kami sekarang'}
Gunakan pendekatan emosional dan persuasif. Hanya tulis script-nya saja.`
  } else if (type === 'mc') {
    const types: Record<string,string> = {
      pernikahan:'pernikahan sakral dan mewah', ulang_tahun:'ulang tahun yang meriah',
      seminar:'seminar profesional', wisuda:'wisuda akademis', launching:'product launching eksklusif',
      konser:'konser musik meriah', olahraga:'pertandingan olahraga seru', keagamaan:'acara keagamaan yang khidmat'
    }
    prompt = `Buat script pembawa acara (MC) untuk ${types[acaraType]||acaraType} dalam bahasa Indonesia. Sekitar 150-200 kata. Natural, profesional, dan sesuai nuansa acara. Hanya script saja.`
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] }) }
    )
    const data = await res.json()
    const script = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return NextResponse.json({ script })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
