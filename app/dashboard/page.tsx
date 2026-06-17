'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic2, LogOut, History, Volume2, AlertCircle, Download, 
         Newspaper, PartyPopper, Megaphone, Headphones, 
         Loader2, Wand2, Radio, BookOpen, Play, Pause } from 'lucide-react'

interface UserInfo {
  fullName: string; email: string; dailyUsed: number; dailyQuota: number; status: string
}

const VOICES = [
  { id:'Kore', name:'Kore', desc:'Wanita Muda (20-30th)', gender:'W', use:'Iklan, konten sosmed' },
  { id:'Aoede', name:'Aoede', desc:'Wanita Dewasa (30-45th)', gender:'W', use:'Berita, podcast, MC' },
  { id:'Leda', name:'Leda', desc:'Wanita Senior (45+)', gender:'W', use:'Narasi, audiobook' },
  { id:'Charon', name:'Charon', desc:'Pria Muda (20-30th)', gender:'P', use:'Iklan, radio, DJ' },
  { id:'Fenrir', name:'Fenrir', desc:'Pria Dewasa (30-45th)', gender:'P', use:'MC, presentasi' },
  { id:'Orus', name:'Orus', desc:'Pria Senior (45+)', gender:'P', use:'Berita, narasi formal' },
  { id:'Puck', name:'Puck', desc:'Netral Muda', gender:'W', use:'Umum' },
  { id:'Zephyr', name:'Zephyr', desc:'Energik', gender:'P', use:'Olahraga, promo' },
  { id:'Schedar', name:'Schedar', desc:'Profesional', gender:'P', use:'Korporat, seminar' },
]

const STYLES = [
  { value:'', label:'Standar' },
  { value:'Bicara dengan energi tinggi dan antusias', label:'Energik' },
  { value:'Bicara dengan nada profesional dan formal', label:'Profesional' },
  { value:'Bicara dengan santai dan ramah', label:'Santai & Ramah' },
  { value:'Bicara perlahan dan jelas seperti presenter berita', label:'Presenter Berita' },
  { value:'Bicara persuasif seperti iklan radio', label:'Iklan / Promosi' },
  { value:'Bicara dengan penuh semangat seperti MC acara', label:'MC Acara' },
  { value:'Bicara dramatis dan penuh penghayatan', label:'Dramatis' },
  { value:'Bisikkan dengan lembut dan misterius', label:'Bisikan Lembut' },
]

type ActiveTab = 'tts' | 'podcast' | 'iklan' | 'berita' | 'mc' | 'suara' | 'history'

interface HistoryItem { 
  text: string; voice: string; feature: string; audioUrl: string; time: string; blob: Blob
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tts')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedVoiceCard, setSelectedVoiceCard] = useState('Aoede')

  // TTS state
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('Aoede')
  const [style, setStyle] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBlob, setAudioBlob] = useState<Blob|null>(null)

  // Podcast state
  const [podcastTopic, setPodcastTopic] = useState('')
  const [podcastScript, setPodcastScript] = useState('')
  const [host1Voice, setHost1Voice] = useState('Charon')
  const [host2Voice, setHost2Voice] = useState('Kore')
  const [podcastDuration, setPodcastDuration] = useState('sedang')
  const [podcastFormat, setPodcastFormat] = useState('diskusi')
  const [podcastSegments, setPodcastSegments] = useState<{label:string;text:string;url:string}[]>([])
  const [podcastLoading, setPodcastLoading] = useState(false)

  // Iklan state
  const [iklanTab, setIklanTab] = useState<'iklan'|'testimoni'|'promo'>('iklan')
  const [prodName, setProdName] = useState('')
  const [prodBenefit, setProdBenefit] = useState('')
  const [prodTarget, setProdTarget] = useState('')
  const [prodCTA, setProdCTA] = useState('')
  const [iklanVoice, setIklanVoice] = useState('Kore')
  const [iklanDurasi, setIklanDurasi] = useState('30 detik')
  const [iklanScript, setIklanScript] = useState('')
  const [iklanAudio, setIklanAudio] = useState('')
  const [iklanLoading, setIklanLoading] = useState(false)

  // Testimoni state
  const [testiName, setTestiName] = useState('')
  const [testiProduk, setTestiProduk] = useState('')
  const [testiIsi, setTestiIsi] = useState('')
  const [testiVoice, setTestiVoice] = useState('Kore')
  const [testiAudio, setTestiAudio] = useState('')

  // Promo state
  const [promoToko, setPromoToko] = useState('')
  const [promoDiskon, setPromoDiskon] = useState('')
  const [promoWaktu, setPromoWaktu] = useState('')
  const [promoVoice, setPromoVoice] = useState('Zephyr')
  const [promoAudio, setPromoAudio] = useState('')

  // Berita state
  const [newsStation, setNewsStation] = useState('')
  const [newsText, setNewsText] = useState('')
  const [newsVoice, setNewsVoice] = useState('Aoede')
  const [newsSpeed, setNewsSpeed] = useState('')
  const [newsStyle, setNewsStyle] = useState('seperti anchor berita televisi nasional')
  const [beritaAudio, setBeritaAudio] = useState('')
  const [beritaLoading, setBeritaLoading] = useState(false)

  // MC state
  const [acaraType, setAcaraType] = useState('pernikahan')
  const [acaraVoice, setAcaraVoice] = useState('Fenrir')
  const [acaraScript, setAcaraScript] = useState('')
  const [acaraAudio, setAcaraAudio] = useState('')
  const [acaraLoading, setAcaraLoading] = useState(false)
  const [scriptLoading, setScriptLoading] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => { fetchMe() }, [])

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) { const d = await res.json(); setUser(d.user) }
    } catch {}
  }

  async function callTTS(txt: string, v: string, st: string, feature: string): Promise<Blob> {
    const res = await fetch('/api/generate/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, voice: v, style: st, feature })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Gagal generate')
    const bytes = atob(data.audio)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: 'audio/wav' })
  }

  function blobToUrl(blob: Blob): string { return URL.createObjectURL(blob) }

  function addHistory(txt: string, v: string, feat: string, blob: Blob) {
    const url = blobToUrl(blob)
    setHistory(prev => [{
      text: txt.substring(0, 60) + (txt.length > 60 ? '...' : ''),
      voice: v, feature: feat, audioUrl: url, blob,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }, ...prev.slice(0, 19)])
    setUser(prev => prev ? { ...prev, dailyUsed: prev.dailyUsed + 1 } : null)
  }

  // ===== GENERATE TTS =====
  async function generateAudio() {
    if (!text.trim()) { setError('Masukkan teks terlebih dahulu'); return }
    setError(''); setLoading(true); setAudioUrl('')
    try {
      const blob = await callTTS(text, voice, style, 'tts')
      const url = blobToUrl(blob)
      setAudioBlob(blob); setAudioUrl(url)
      addHistory(text, voice, 'Teks ke Suara', blob)
      setTimeout(() => audioRef.current?.play(), 100)
    } catch(e: any) { setError(e.message) }
    setLoading(false)
  }

  // ===== GENERATE PODCAST =====
  async function generatePodcast() {
    if (!podcastTopic && !podcastScript) { setError('Masukkan topik podcast'); return }
    setError(''); setPodcastLoading(true); setPodcastSegments([])
    try {
      let script = podcastScript
      if (!script) {
        // Generate script via AI dulu
        const res = await fetch('/api/generate/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'podcast', topic: podcastTopic, duration: podcastDuration, format: podcastFormat })
        })
        const d = await res.json()
        script = d.script || ''
        setPodcastScript(script)
      }
      const lines = script.split('\n').filter((l:string) => l.trim() && (l.startsWith('Host1:') || l.startsWith('Host2:')))
      const segs: {label:string;text:string;url:string}[] = []
      for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const line = lines[i]
        const isH1 = line.startsWith('Host1:')
        const txt = line.replace(/^Host[12]:\s*/, '').trim()
        const v = isH1 ? host1Voice : host2Voice
        const blob = await callTTS(txt, v, 'Bicara dengan santai dan natural', 'podcast')
        const url = blobToUrl(blob)
        segs.push({ label: isH1 ? `Host 1 (${host1Voice})` : `Host 2 (${host2Voice})`, text: txt, url })
        setPodcastSegments([...segs])
      }
    } catch(e: any) { setError(e.message) }
    setPodcastLoading(false)
  }

  // ===== GENERATE IKLAN =====
  async function generateIklan() {
    if (!prodName) { setError('Masukkan nama produk'); return }
    setError(''); setIklanLoading(true)
    try {
      const res = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'iklan', prodName, prodBenefit, prodTarget, prodCTA, durasi: iklanDurasi })
      })
      const d = await res.json()
      const script = d.script || `${prodName}! ${prodBenefit}. ${prodCTA}`
      setIklanScript(script)
      const blob = await callTTS(script, iklanVoice, 'Bicara persuasif seperti iklan radio dengan energi tinggi', 'iklan')
      setIklanAudio(blobToUrl(blob))
      addHistory(script, iklanVoice, 'Iklan Produk', blob)
    } catch(e: any) { setError(e.message) }
    setIklanLoading(false)
  }

  async function generateTestimoni() {
    if (!testiIsi) { setError('Masukkan isi testimoni'); return }
    setError(''); setLoading(true)
    try {
      const txt = `${testiName ? testiName + ' berkata: ' : ''}${testiIsi}`
      const blob = await callTTS(txt, testiVoice, 'Bicara jujur dan natural seperti pelanggan yang puas', 'testimoni')
      setTestiAudio(blobToUrl(blob))
      addHistory(txt, testiVoice, 'Testimoni', blob)
    } catch(e: any) { setError(e.message) }
    setLoading(false)
  }

  async function generatePromo() {
    if (!promoToko || !promoDiskon) { setError('Lengkapi nama toko dan penawaran'); return }
    setError(''); setLoading(true)
    try {
      const txt = `PERHATIAN! ${promoToko} menghadirkan penawaran SPESIAL! ${promoDiskon}! ${promoWaktu ? 'Hanya ' + promoWaktu + ' saja!' : ''} Jangan sampai ketinggalan! Segera kunjungi kami sekarang juga!`
      const blob = await callTTS(txt, promoVoice, 'Bicara dengan sangat antusias dan energik seperti iklan promo', 'promo')
      setPromoAudio(blobToUrl(blob))
      addHistory(txt, promoVoice, 'Flash Sale', blob)
    } catch(e: any) { setError(e.message) }
    setLoading(false)
  }

  // ===== GENERATE BERITA =====
  async function generateBerita() {
    if (!newsText) { setError('Masukkan teks berita'); return }
    setError(''); setBeritaLoading(true)
    try {
      const full = (newsStation ? newsStation + ' ' : '') + newsText
      const blob = await callTTS(full, newsVoice, `Bicara ${newsSpeed}${newsStyle}, dengan intonasi berita yang jelas`, 'berita')
      setBeritaAudio(blobToUrl(blob))
      addHistory(full, newsVoice, 'Berita', blob)
    } catch(e: any) { setError(e.message) }
    setBeritaLoading(false)
  }

  // ===== GENERATE MC =====
  async function generateMCScript() {
    setScriptLoading(true)
    try {
      const res = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mc', acaraType })
      })
      const d = await res.json()
      setAcaraScript(d.script || '')
    } catch(e: any) { setError(e.message) }
    setScriptLoading(false)
  }

  async function generateAcara() {
    if (!acaraScript) { setError('Generate atau masukkan script MC dulu'); return }
    setError(''); setAcaraLoading(true)
    try {
      const blob = await callTTS(acaraScript, acaraVoice, 'Bicara dengan penuh semangat dan profesionalisme seperti MC acara', 'mc')
      setAcaraAudio(blobToUrl(blob))
      addHistory(acaraScript, acaraVoice, 'MC Acara', blob)
    } catch(e: any) { setError(e.message) }
    setAcaraLoading(false)
  }

  function downloadBlob(url: string, name: string) {
    const a = document.createElement('a'); a.href = url; a.download = name + '-' + Date.now() + '.wav'; a.click()
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  const quotaPct = user ? Math.round((user.dailyUsed / user.dailyQuota) * 100) : 0

  const navItems = [
    { id:'tts', label:'Teks ke Suara', icon:<Volume2 size={14}/> },
    { id:'podcast', label:'Podcast AI', icon:<Headphones size={14}/> },
    { id:'iklan', label:'Iklan & Produk', icon:<Megaphone size={14}/> },
    { id:'berita', label:'Pembaca Berita', icon:<Newspaper size={14}/> },
    { id:'mc', label:'MC & Acara', icon:<PartyPopper size={14}/> },
    { id:'suara', label:'Direktori Suara', icon:<Mic2 size={14}/> },
    { id:'history', label:'Riwayat', icon:<History size={14}/> },
  ]

  const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
  const selectCls = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
  const btnPrimary = "w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
  const btnSecondary = "flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-2 rounded-lg transition-colors"

  function AudioResult({ url, onDownload, label }: { url: string; onDownload: () => void; label?: string }) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mt-4">
        {label && <p className="text-xs text-green-400 mb-2 font-medium">✓ {label}</p>}
        <audio controls src={url} className="w-full mb-3" />
        <button onClick={onDownload} className={btnSecondary}><Download size={13}/> Unduh WAV</button>
      </div>
    )
  }

  function ErrorMsg() {
    if (!error) return null
    return (
      <div className="flex gap-2 bg-red-950 border border-red-800 rounded-xl p-3 mt-3">
        <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0"/>
        <p className="text-sm text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <Mic2 size={15} className="text-white"/>
          </div>
          <span className="text-white font-medium text-sm">Suara Cerdas</span>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400">{user.dailyUsed}/{user.dailyQuota} hari ini</span>
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${quotaPct>=90?'bg-red-500':quotaPct>=70?'bg-yellow-500':'bg-purple-500'}`}
                  style={{ width: `${Math.min(quotaPct,100)}%` }}/>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-700 flex items-center justify-center">
              <span className="text-white text-xs font-medium">{user?.fullName?.[0]?.toUpperCase()||'U'}</span>
            </div>
            <span className="text-gray-300 text-sm hidden sm:block">{user?.fullName}</span>
          </div>
          <button onClick={logout} className="text-gray-500 hover:text-gray-300"><LogOut size={15}/></button>
        </div>
      </header>

      <div className="flex max-w-6xl mx-auto">
        {/* Sidebar Nav */}
        <aside className="w-48 flex-shrink-0 border-r border-gray-800 min-h-screen p-3 hidden md:block">
          <nav className="space-y-1 sticky top-16">
            {navItems.map(n => (
              <button key={n.id} onClick={() => { setActiveTab(n.id as ActiveTab); setError('') }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${activeTab===n.id?'bg-purple-600 text-white':'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                {n.icon} {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Nav */}
        <div className="md:hidden w-full fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex overflow-x-auto z-10 px-2 py-1.5 gap-1">
          {navItems.map(n => (
            <button key={n.id} onClick={() => { setActiveTab(n.id as ActiveTab); setError('') }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs flex-shrink-0 transition-colors ${activeTab===n.id?'bg-purple-600 text-white':'text-gray-500'}`}>
              {n.icon}<span>{n.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-20 md:pb-6 max-w-2xl">

          {/* ===== TEKS KE SUARA ===== */}
          {activeTab === 'tts' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Teks ke Suara</h2>
              <p className="text-gray-500 text-sm mb-5">Ubah teks menjadi suara alami dengan kontrol penuh</p>

              {/* Preset */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  {k:'iklan',l:'Iklan',i:<Megaphone size={12}/>,t:'Dapatkan produk terbaik kami sekarang! Kualitas premium, harga terjangkau. Jangan lewatkan penawaran spesial ini. Hubungi kami sekarang!',s:'Bicara persuasif seperti iklan radio',v:'Kore'},
                  {k:'berita',l:'Berita',i:<Newspaper size={12}/>,t:'Selamat pagi pemirsa. Berikut rangkuman berita utama hari ini. Pemerintah mengumumkan kebijakan baru yang akan berlaku bulan depan.',s:'Bicara perlahan dan jelas seperti presenter berita',v:'Aoede'},
                  {k:'podcast',l:'Podcast',i:<Headphones size={12}/>,t:'Halo dan selamat datang di podcast kami! Di episode kali ini, kita akan membahas topik yang sangat menarik dan bermanfaat.',s:'Bicara dengan santai dan ramah',v:'Charon'},
                  {k:'radio',l:'Radio DJ',i:<Radio size={12}/>,t:'Hei hei hei! Selamat datang di frekuensi paling hits! Kalian lagi bareng aku dan kita siap menemani hari kalian dengan musik terbaik!',s:'Bicara dengan energi tinggi dan antusias',v:'Charon'},
                  {k:'mc',l:'MC Acara',i:<PartyPopper size={12}/>,t:'Hadirin yang kami hormati, selamat datang di acara yang sangat istimewa ini. Mari kita mulai acara yang luar biasa ini bersama-sama!',s:'Bicara dengan penuh semangat seperti MC acara',v:'Fenrir'},
                  {k:'narasi',l:'Narasi',i:<BookOpen size={12}/>,t:'Di sebuah kota yang diterangi cahaya bintang, terdapat sebuah cerita yang tak terlupakan. Kisah ini dimulai dari sebuah mimpi kecil yang tumbuh menjadi kenyataan.',s:'Bicara dramatis dan penuh penghayatan',v:'Leda'},
                ].map(p => (
                  <button key={p.k} onClick={() => { setText(p.t); setStyle(p.s); setVoice(p.v) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
                    {p.i} {p.l}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <label className="block text-xs text-gray-400 mb-2">Teks untuk diucapkan</label>
                  <textarea value={text} onChange={e => setText(e.target.value)} rows={5} maxLength={5000}
                    placeholder="Ketik atau tempel teks di sini..."
                    className="w-full bg-transparent text-white text-sm placeholder-gray-600 resize-none focus:outline-none leading-relaxed"/>
                  <div className="flex justify-between mt-2 pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-600">{text.length}/5000</span>
                    <button onClick={() => setText('')} className="text-xs text-gray-600 hover:text-gray-400">Hapus</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Pilih Suara</label>
                    <select value={voice} onChange={e => setVoice(e.target.value)} className={selectCls}>
                      <optgroup label="Wanita">
                        {VOICES.filter(v=>v.gender==='W').map(v=><option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                      </optgroup>
                      <optgroup label="Pria">
                        {VOICES.filter(v=>v.gender==='P').map(v=><option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Gaya Bicara</label>
                    <select value={style} onChange={e => setStyle(e.target.value)} className={selectCls}>
                      {STYLES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>

                <ErrorMsg/>
                <button onClick={generateAudio} disabled={loading||!text.trim()} className={btnPrimary}>
                  {loading?<><Loader2 size={16} className="animate-spin"/> Memproses...</>:<><Volume2 size={16}/> Ucapkan Teks</>}
                </button>
                {audioUrl && <AudioResult url={audioUrl} onDownload={() => downloadBlob(audioUrl,'tts')} label="Audio berhasil dibuat"/>}
              </div>
            </div>
          )}

          {/* ===== PODCAST AI ===== */}
          {activeTab === 'podcast' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Podcast AI</h2>
              <p className="text-gray-500 text-sm mb-5">Buat podcast dua suara otomatis dari topik pilihan</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Topik Podcast</label>
                  <input value={podcastTopic} onChange={e => setPodcastTopic(e.target.value)} className={inputCls} placeholder="Contoh: Tips jualan online untuk UMKM 2025"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Suara Host 1 (Pria)</label>
                    <select value={host1Voice} onChange={e=>setHost1Voice(e.target.value)} className={selectCls}>
                      {VOICES.filter(v=>v.gender==='P').map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Suara Host 2 (Wanita)</label>
                    <select value={host2Voice} onChange={e=>setHost2Voice(e.target.value)} className={selectCls}>
                      {VOICES.filter(v=>v.gender==='W').map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Durasi Target</label>
                    <select value={podcastDuration} onChange={e=>setPodcastDuration(e.target.value)} className={selectCls}>
                      <option value="pendek">Pendek (2-3 menit)</option>
                      <option value="sedang">Sedang (5-7 menit)</option>
                      <option value="panjang">Panjang (10-15 menit)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Format</label>
                    <select value={podcastFormat} onChange={e=>setPodcastFormat(e.target.value)} className={selectCls}>
                      <option value="diskusi">Diskusi Santai</option>
                      <option value="interview">Interview</option>
                      <option value="edukasi">Edukasi</option>
                      <option value="berita">Review Berita</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Script (opsional — kosongkan untuk auto-generate)</label>
                  <textarea value={podcastScript} onChange={e=>setPodcastScript(e.target.value)} rows={5} className={inputCls}
                    placeholder="Host1: Halo selamat datang...&#10;Host2: Iya hari ini kita bahas..."/>
                </div>
                <ErrorMsg/>
                <button onClick={generatePodcast} disabled={podcastLoading} className={btnPrimary}>
                  {podcastLoading?<><Loader2 size={16} className="animate-spin"/> Generating podcast...</>:<><Headphones size={16}/> Generate Podcast</>}
                </button>
                {podcastSegments.length > 0 && (
                  <div className="space-y-3 mt-4">
                    {podcastSegments.map((seg,i) => (
                      <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                        <p className="text-xs text-purple-400 mb-1 font-medium">{seg.label}</p>
                        <p className="text-xs text-gray-400 mb-2 italic">"{seg.text.substring(0,80)}..."</p>
                        <audio controls src={seg.url} className="w-full"/>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== IKLAN & PRODUK ===== */}
          {activeTab === 'iklan' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Iklan & Produk</h2>
              <p className="text-gray-500 text-sm mb-4">Generate script iklan dan voiceover untuk marketing</p>
              <div className="flex gap-2 mb-5">
                {[['iklan','Script Iklan'],['testimoni','Testimoni'],['promo','Flash Sale']].map(([id,label]) => (
                  <button key={id} onClick={() => setIklanTab(id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${iklanTab===id?'bg-purple-600 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {iklanTab === 'iklan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-400 mb-1.5">Nama Produk</label><input value={prodName} onChange={e=>setProdName(e.target.value)} className={inputCls} placeholder="Kripik Singkong Bakar"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Keunggulan</label><input value={prodBenefit} onChange={e=>setProdBenefit(e.target.value)} className={inputCls} placeholder="renyah, gurih, tanpa pengawet"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Target Pasar</label><input value={prodTarget} onChange={e=>setProdTarget(e.target.value)} className={inputCls} placeholder="ibu rumah tangga 25-45th"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Call to Action</label><input value={prodCTA} onChange={e=>setProdCTA(e.target.value)} className={inputCls} placeholder="WA 0812-xxxx sekarang!"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Suara</label><select value={iklanVoice} onChange={e=>setIklanVoice(e.target.value)} className={selectCls}>{VOICES.map(v=><option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}</select></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Durasi Iklan</label><select value={iklanDurasi} onChange={e=>setIklanDurasi(e.target.value)} className={selectCls}><option>15 detik</option><option>30 detik</option><option>60 detik</option></select></div>
                  </div>
                  <ErrorMsg/>
                  <button onClick={generateIklan} disabled={iklanLoading} className={btnPrimary}>
                    {iklanLoading?<><Loader2 size={16} className="animate-spin"/> Generating...</>:<><Megaphone size={16}/> Generate Script & Suara</>}
                  </button>
                  {iklanScript && <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 italic leading-relaxed">{iklanScript}</div>}
                  {iklanAudio && <AudioResult url={iklanAudio} onDownload={() => downloadBlob(iklanAudio,'iklan')} label="Iklan siap"/>}
                </div>
              )}

              {iklanTab === 'testimoni' && (
                <div className="space-y-3">
                  <div><label className="block text-xs text-gray-400 mb-1.5">Nama Pelanggan</label><input value={testiName} onChange={e=>setTestiName(e.target.value)} className={inputCls} placeholder="Ibu Sari dari Jakarta"/></div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Produk / Layanan</label><input value={testiProduk} onChange={e=>setTestiProduk(e.target.value)} className={inputCls} placeholder="Kripik Singkong Bakar"/></div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Isi Testimoni</label><textarea value={testiIsi} onChange={e=>setTestiIsi(e.target.value)} rows={4} className={inputCls} placeholder="Saya sudah coba banyak produk, tapi ini yang paling bagus..."/></div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Suara</label><select value={testiVoice} onChange={e=>setTestiVoice(e.target.value)} className={selectCls}>{VOICES.map(v=><option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}</select></div>
                  <ErrorMsg/>
                  <button onClick={generateTestimoni} disabled={loading} className={btnPrimary}>
                    {loading?<><Loader2 size={16} className="animate-spin"/> Generating...</>:<><Volume2 size={16}/> Generate Suara Testimoni</>}
                  </button>
                  {testiAudio && <AudioResult url={testiAudio} onDownload={() => downloadBlob(testiAudio,'testimoni')} label="Testimoni siap"/>}
                </div>
              )}

              {iklanTab === 'promo' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs text-gray-400 mb-1.5">Nama Toko / Brand</label><input value={promoToko} onChange={e=>setPromoToko(e.target.value)} className={inputCls} placeholder="Dapur Mama Sari"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Diskon / Penawaran</label><input value={promoDiskon} onChange={e=>setPromoDiskon(e.target.value)} className={inputCls} placeholder="diskon 50% semua menu"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Waktu Promo</label><input value={promoWaktu} onChange={e=>setPromoWaktu(e.target.value)} className={inputCls} placeholder="Sabtu-Minggu ini saja"/></div>
                    <div><label className="block text-xs text-gray-400 mb-1.5">Suara</label><select value={promoVoice} onChange={e=>setPromoVoice(e.target.value)} className={selectCls}>{VOICES.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                  </div>
                  <ErrorMsg/>
                  <button onClick={generatePromo} disabled={loading} className={btnPrimary}>
                    {loading?<><Loader2 size={16} className="animate-spin"/> Generating...</>:<><Megaphone size={16}/> Generate Suara Promo</>}
                  </button>
                  {promoAudio && <AudioResult url={promoAudio} onDownload={() => downloadBlob(promoAudio,'promo')} label="Promo siap"/>}
                </div>
              )}
            </div>
          )}

          {/* ===== BERITA ===== */}
          {activeTab === 'berita' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Pembaca Berita</h2>
              <p className="text-gray-500 text-sm mb-5">Format dan ucapkan berita dengan gaya presenter profesional</p>
              <div className="space-y-4">
                <div><label className="block text-xs text-gray-400 mb-1.5">Pembuka / Station ID (opsional)</label><input value={newsStation} onChange={e=>setNewsStation(e.target.value)} className={inputCls} placeholder="Selamat pagi, Anda mendengarkan Berita Siang RRI..."/></div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Teks Berita</label>
                  <textarea value={newsText} onChange={e=>setNewsText(e.target.value)} rows={7} className={inputCls} placeholder="Tempelkan teks berita di sini..."/>
                  <p className="text-xs text-gray-600 mt-1 text-right">{newsText.length} karakter</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-xs text-gray-400 mb-1.5">Presenter</label>
                    <select value={newsVoice} onChange={e=>setNewsVoice(e.target.value)} className={selectCls}>
                      <option value="Aoede">Aoede – Wanita</option>
                      <option value="Leda">Leda – Wanita Senior</option>
                      <option value="Fenrir">Fenrir – Pria</option>
                      <option value="Orus">Orus – Pria Senior</option>
                      <option value="Schedar">Schedar – Formal</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Kecepatan</label>
                    <select value={newsSpeed} onChange={e=>setNewsSpeed(e.target.value)} className={selectCls}>
                      <option value="agak lambat, ">Lambat</option>
                      <option value="">Normal</option>
                      <option value="agak cepat, ">Cepat</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Gaya</label>
                    <select value={newsStyle} onChange={e=>setNewsStyle(e.target.value)} className={selectCls}>
                      <option value="seperti anchor berita televisi nasional">TV Nasional</option>
                      <option value="seperti penyiar radio berita">Radio Berita</option>
                      <option value="seperti presenter berita digital yang modern">Digital/Modern</option>
                    </select>
                  </div>
                </div>
                <ErrorMsg/>
                <button onClick={generateBerita} disabled={beritaLoading} className={btnPrimary}>
                  {beritaLoading?<><Loader2 size={16} className="animate-spin"/> Generating...</>:<><Newspaper size={16}/> Bacakan Berita</>}
                </button>
                {beritaAudio && <AudioResult url={beritaAudio} onDownload={() => downloadBlob(beritaAudio,'berita')} label="Berita siap diputar"/>}
              </div>
            </div>
          )}

          {/* ===== MC & ACARA ===== */}
          {activeTab === 'mc' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">MC & Acara</h2>
              <p className="text-gray-500 text-sm mb-5">Script dan suara pembawa acara untuk berbagai event</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-400 mb-1.5">Jenis Acara</label>
                    <select value={acaraType} onChange={e=>setAcaraType(e.target.value)} className={selectCls}>
                      <option value="pernikahan">Pernikahan</option>
                      <option value="ulang_tahun">Ulang Tahun</option>
                      <option value="seminar">Seminar / Webinar</option>
                      <option value="wisuda">Wisuda</option>
                      <option value="launching">Product Launching</option>
                      <option value="konser">Konser / Hiburan</option>
                      <option value="olahraga">Acara Olahraga</option>
                      <option value="keagamaan">Acara Keagamaan</option>
                    </select>
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1.5">Suara MC</label>
                    <select value={acaraVoice} onChange={e=>setAcaraVoice(e.target.value)} className={selectCls}>
                      {VOICES.map(v=><option key={v.id} value={v.id}>{v.name} — {v.desc}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs text-gray-400 mb-1.5">Script MC</label>
                  <textarea value={acaraScript} onChange={e=>setAcaraScript(e.target.value)} rows={7} className={inputCls} placeholder="Ketik script atau klik Generate Script untuk auto-generate..."/>
                </div>
                <div className="flex gap-3">
                  <button onClick={generateMCScript} disabled={scriptLoading} className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-medium py-3 rounded-xl transition-colors">
                    {scriptLoading?<><Loader2 size={14} className="animate-spin"/> Generating...</>:<><Wand2 size={14}/> Generate Script</>}
                  </button>
                  <button onClick={generateAcara} disabled={acaraLoading} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-3 rounded-xl transition-colors">
                    {acaraLoading?<><Loader2 size={14} className="animate-spin"/> Generating...</>:<><Volume2 size={14}/> Ucapkan</>}
                  </button>
                </div>
                <ErrorMsg/>
                {acaraAudio && <AudioResult url={acaraAudio} onDownload={() => downloadBlob(acaraAudio,'mc-acara')} label="Script MC siap"/>}
              </div>
            </div>
          )}

          {/* ===== DIREKTORI SUARA ===== */}
          {activeTab === 'suara' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Direktori Suara</h2>
              <p className="text-gray-500 text-sm mb-5">Semua pilihan suara tersedia — klik untuk pilih sebagai default</p>
              <div className="space-y-3">
                {[{label:'Suara Wanita',voices:VOICES.filter(v=>v.gender==='W')},{label:'Suara Pria',voices:VOICES.filter(v=>v.gender==='P')}].map(g => (
                  <div key={g.label}>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">{g.label}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {g.voices.map(v => (
                        <div key={v.id} onClick={() => { setSelectedVoiceCard(v.id); setVoice(v.id); setActiveTab('tts') }}
                          className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedVoiceCard===v.id?'border-purple-500 bg-purple-950':'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${v.gender==='W'?'bg-pink-950':'bg-purple-950'}`}>
                            <Mic2 size={18} className={v.gender==='W'?'text-pink-400':'text-purple-400'}/>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{v.name}</p>
                              {selectedVoiceCard===v.id && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Aktif</span>}
                            </div>
                            <p className="text-xs text-gray-400">{v.desc}</p>
                            <p className="text-xs text-purple-400 mt-0.5">{v.use}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== RIWAYAT ===== */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-lg font-medium text-white mb-1">Riwayat</h2>
              <p className="text-gray-500 text-sm mb-5">Audio yang dibuat selama sesi ini</p>
              {history.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <History size={32} className="mx-auto mb-3 opacity-50"/>
                  <p>Belum ada riwayat generate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-4">
                          <span className="text-xs text-purple-400 font-medium">{item.feature} • {item.voice}</span>
                          <p className="text-sm text-gray-300 mt-0.5">{item.text}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-600">{item.time}</span>
                          <a href={item.audioUrl} download={`suara-${i}.wav`} className="text-gray-500 hover:text-gray-300">
                            <Download size={14}/>
                          </a>
                        </div>
                      </div>
                      <audio controls src={item.audioUrl} className="w-full" style={{height:'32px'}}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
