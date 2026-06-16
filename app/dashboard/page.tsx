'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic2, LogOut, History, Settings, Volume2, AlertCircle, Download, ChevronDown,
         Newspaper, PartyPopper, Megaphone, Headphones, User, Bell } from 'lucide-react'

interface UserInfo {
  fullName: string
  email: string
  dailyUsed: number
  dailyQuota: number
  status: string
}

const VOICES = [
  { id: 'Kore', name: 'Kore', desc: 'Wanita Muda', gender: 'W' },
  { id: 'Aoede', name: 'Aoede', desc: 'Wanita Dewasa', gender: 'W' },
  { id: 'Leda', name: 'Leda', desc: 'Wanita Senior', gender: 'W' },
  { id: 'Charon', name: 'Charon', desc: 'Pria Muda', gender: 'P' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Pria Dewasa', gender: 'P' },
  { id: 'Orus', name: 'Orus', desc: 'Pria Senior', gender: 'P' },
  { id: 'Puck', name: 'Puck', desc: 'Netral', gender: 'N' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Energik', gender: 'P' },
  { id: 'Schedar', name: 'Schedar', desc: 'Profesional', gender: 'P' },
]

const STYLES = [
  { value: '', label: 'Standar' },
  { value: 'Bicara dengan energi tinggi dan antusias', label: 'Energik' },
  { value: 'Bicara dengan nada profesional dan formal', label: 'Profesional' },
  { value: 'Bicara dengan santai dan ramah', label: 'Santai' },
  { value: 'Bicara perlahan dan jelas seperti presenter berita', label: 'Presenter Berita' },
  { value: 'Bicara persuasif seperti iklan radio', label: 'Iklan / Promosi' },
  { value: 'Bicara dengan penuh semangat seperti MC acara', label: 'MC Acara' },
  { value: 'Bicara dramatis dan penuh penghayatan', label: 'Dramatis' },
  { value: 'Bisikkan dengan lembut', label: 'Bisikan Lembut' },
]

const PRESETS = {
  iklan: { text: 'Dapatkan produk terbaik kami sekarang! Kualitas premium, harga terjangkau. Jangan lewatkan penawaran spesial ini. Hubungi kami sekarang!', style: 'Bicara persuasif seperti iklan radio', voice: 'Kore' },
  berita: { text: 'Selamat pagi pemirsa. Berikut adalah rangkuman berita utama hari ini. Pemerintah mengumumkan kebijakan baru yang akan mulai berlaku bulan depan.', style: 'Bicara perlahan dan jelas seperti presenter berita', voice: 'Aoede' },
  podcast: { text: 'Halo dan selamat datang di podcast kami! Di episode kali ini, kita akan membahas topik yang sangat menarik dan pastinya bermanfaat untuk kalian semua.', style: 'Bicara dengan santai dan ramah', voice: 'Charon' },
  mc: { text: 'Hadirin yang kami hormati, selamat datang di acara yang sangat istimewa ini. Kami sangat senang dapat hadir bersama Anda malam ini. Mari kita mulai!', style: 'Bicara dengan penuh semangat seperti MC acara', voice: 'Fenrir' },
}

type ActiveTab = 'tts' | 'history'
type HistoryItem = { text: string; voice: string; feature: string; audioUrl: string; time: string }

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tts')
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('Aoede')
  const [style, setStyle] = useState('')
  const [feature, setFeature] = useState('tts')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    fetchMe()
  }, [])

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch {}
  }

  async function generate() {
    if (!text.trim()) { setError('Masukkan teks terlebih dahulu'); return }
    setError('')
    setLoading(true)
    setAudioUrl('')

    try {
      const res = await fetch('/api/generate/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, style, feature })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal generate')
        return
      }

      // Convert base64 ke blob
      const bytes = atob(data.audio)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'audio/wav' })
      const url = URL.createObjectURL(blob)

      setAudioBlob(blob)
      setAudioUrl(url)

      // Tambah ke history
      setHistory(prev => [{
        text: text.substring(0, 60) + (text.length > 60 ? '...' : ''),
        voice,
        feature,
        audioUrl: url,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }, ...prev.slice(0, 19)])

      // Update quota display
      setUser(prev => prev ? { ...prev, dailyUsed: prev.dailyUsed + 1 } : null)

      // Auto play
      setTimeout(() => audioRef.current?.play(), 100)

    } catch (err) {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function loadPreset(key: keyof typeof PRESETS) {
    const p = PRESETS[key]
    setText(p.text)
    setStyle(p.style)
    setVoice(p.voice)
    setFeature(key === 'iklan' ? 'iklan' : key === 'berita' ? 'berita' : key === 'mc' ? 'mc' : 'tts')
  }

  function download() {
    if (!audioBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(audioBlob)
    a.download = `suara-cerdas-${Date.now()}.wav`
    a.click()
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  const quotaPct = user ? Math.round((user.dailyUsed / user.dailyQuota) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Mic2 size={16} className="text-white" />
          </div>
          <span className="text-white font-medium text-sm">Suara Cerdas</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Kuota bar */}
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400">{user.dailyUsed}/{user.dailyQuota} hari ini</span>
              <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaPct >= 90 ? 'bg-red-500' : quotaPct >= 70 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(quotaPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center">
              <span className="text-white text-xs font-medium">{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <span className="text-gray-300 text-sm hidden sm:block">{user?.fullName}</span>
          </div>

          <button onClick={logout} className="text-gray-500 hover:text-gray-300 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6">
          {[
            { id: 'tts', label: 'Generate Suara', icon: <Volume2 size={14} /> },
            { id: 'history', label: 'Riwayat', icon: <History size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'tts' && (
          <div className="space-y-4">
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'iklan', label: 'Iklan', icon: <Megaphone size={12} /> },
                { key: 'berita', label: 'Berita', icon: <Newspaper size={12} /> },
                { key: 'podcast', label: 'Podcast', icon: <Headphones size={12} /> },
                { key: 'mc', label: 'MC Acara', icon: <PartyPopper size={12} /> },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => loadPreset(p.key as keyof typeof PRESETS)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors"
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            {/* Text input */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <label className="block text-xs text-gray-400 mb-2">Teks untuk diucapkan</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={5}
                maxLength={5000}
                placeholder="Ketik atau tempel teks di sini..."
                className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed"
              />
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-800">
                <span className="text-xs text-gray-600">{text.length}/5000 karakter</span>
                <button onClick={() => setText('')} className="text-xs text-gray-600 hover:text-gray-400">Hapus</button>
              </div>
            </div>

            {/* Voice + Style */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <label className="block text-xs text-gray-400 mb-2">Pilih Suara</label>
                <select
                  value={voice}
                  onChange={e => setVoice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  <optgroup label="Wanita">
                    {VOICES.filter(v => v.gender === 'W').map(v => (
                      <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Pria">
                    {VOICES.filter(v => v.gender === 'P').map(v => (
                      <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <label className="block text-xs text-gray-400 mb-2">Gaya Bicara</label>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                >
                  {STYLES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex gap-2 bg-red-950 border border-red-800 rounded-xl p-4">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !text.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sedang memproses...
                </>
              ) : (
                <>
                  <Volume2 size={18} />
                  Ucapkan Teks
                </>
              )}
            </button>

            {/* Audio result */}
            {audioUrl && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-green-400 font-medium">Audio berhasil dibuat</span>
                  <span className="text-xs text-gray-500">{voice} • {STYLES.find(s => s.value === style)?.label || 'Standar'}</span>
                </div>
                <audio ref={audioRef} src={audioUrl} controls className="w-full mb-3" />
                <button
                  onClick={download}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <Download size={14} />
                  Unduh WAV
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <History size={32} className="mx-auto mb-3 opacity-50" />
                <p>Belum ada riwayat generate</p>
              </div>
            ) : (
              history.map((item, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-purple-400 font-medium">{item.feature} • {item.voice}</span>
                      <p className="text-sm text-gray-300 mt-0.5">{item.text}</p>
                    </div>
                    <span className="text-xs text-gray-600 ml-4 flex-shrink-0">{item.time}</span>
                  </div>
                  <audio src={item.audioUrl} controls className="w-full h-8 mt-2" />
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
