// Gemini TTS API helper
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
export const GEMINI_MODEL = 'gemini-2.5-flash-preview-tts'

export async function generateTTS(text: string, voice: string, style?: string): Promise<string> {
  const key = GEMINI_API_KEY
  if (!key) throw new Error('Gemini API key belum dikonfigurasi')

  const prompt = style ? `${style}. Ucapkan teks berikut:\n\n${text}` : text

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice }
            }
          }
        }
      })
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `API Error ${res.status}`)
  }

  const data = await res.json()
  const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
  if (!audio) throw new Error('Tidak ada audio yang dihasilkan')
  return audio
}
