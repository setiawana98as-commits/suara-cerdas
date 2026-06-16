import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken, checkAndIncrementQuota } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const token = req.cookies.get('sc_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 })
    }

    // Cek status member aktif
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('status, is_lifetime')
      .eq('id', payload.userId)
      .single()

    if (!user || user.status !== 'active') {
      return NextResponse.json({
        error: 'Akun belum aktif. Pastikan pembayaran sudah dikonfirmasi admin.'
      }, { status: 403 })
    }

    // Cek kuota (admin bypass)
    if (payload.role !== 'admin') {
      const quota = await checkAndIncrementQuota(payload.userId)
      if (!quota.allowed) {
        // Log quota exceeded
        await supabaseAdmin.from('usage_logs').insert({
          user_id: payload.userId,
          feature: 'tts',
          char_count: 0,
          status: 'quota_exceeded'
        })
        return NextResponse.json({
          error: `Kuota harian habis (${quota.used}/${quota.limit}). Reset jam 00.00 WIB.`,
          quotaExceeded: true,
          used: quota.used,
          limit: quota.limit
        }, { status: 429 })
      }
    }

    // Ambil request body
    const { text, voice, style, feature } = await req.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Teks tidak boleh kosong' }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Teks maksimal 5000 karakter' }, { status: 400 })
    }

    // Ambil Gemini API key dari settings atau env
    const { data: setting } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .single()

    const geminiKey = setting?.value || process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return NextResponse.json({ error: 'Gemini API key belum dikonfigurasi' }, { status: 500 })
    }

    const selectedVoice = voice || 'Aoede'
    const prompt = style ? `${style}. Ucapkan teks berikut:\n\n${text}` : text

    // Panggil Gemini TTS API
    const startTime = Date.now()
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice }
              }
            }
          }
        })
      }
    )

    const duration = Date.now() - startTime

    if (!geminiRes.ok) {
      const errData = await geminiRes.json()
      const errMsg = errData.error?.message || 'Gemini API error'

      await supabaseAdmin.from('usage_logs').insert({
        user_id: payload.userId,
        feature: feature || 'tts',
        voice_used: selectedVoice,
        char_count: text.length,
        status: 'error',
        error_message: errMsg
      })

      return NextResponse.json({ error: errMsg }, { status: 502 })
    }

    const data = await geminiRes.json()
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!audioData) {
      return NextResponse.json({ error: 'Tidak ada audio yang dihasilkan' }, { status: 502 })
    }

    // Log sukses
    await supabaseAdmin.from('usage_logs').insert({
      user_id: payload.userId,
      feature: feature || 'tts',
      voice_used: selectedVoice,
      char_count: text.length,
      duration_ms: duration,
      status: 'success'
    })

    // Return audio sebagai base64
    return NextResponse.json({
      success: true,
      audio: audioData,
      mimeType: 'audio/wav',
      charCount: text.length,
      voice: selectedVoice,
      durationMs: duration
    })

  } catch (err) {
    console.error('Generate error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
