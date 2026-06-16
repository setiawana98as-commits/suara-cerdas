'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mic2, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'

type Step = 'form' | 'payment'

interface BankInfo {
  bank_name: string
  bank_account: string
  bank_holder: string
  harga_lifetime: string
  whatsapp_admin: string
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form')
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', referralCode: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null)
  const [userId, setUserId] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [bankName, setBankName] = useState('BCA')
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      setBankInfo(data.bankInfo)
      setUserId(data.userId)
      setStep('payment')

    } catch { setError('Terjadi kesalahan. Coba lagi.') }
    finally { setLoading(false) }
  }

  async function handleUploadProof() {
    if (!proofFile) { setError('Pilih file bukti transfer terlebih dahulu'); return }
    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('proof', proofFile)
      fd.append('bankName', bankName)

      const res = await fetch('/api/auth/upload-proof', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) { setError(data.error); return }
      setUploadDone(true)

    } catch { setError('Gagal upload. Coba lagi.') }
    finally { setUploading(false) }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const harga = parseInt(bankInfo?.harga_lifetime || '89000').toLocaleString('id-ID')

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600 mb-3">
              <Mic2 className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-semibold text-white">Selesaikan Pembayaran</h1>
            <p className="text-gray-400 text-sm mt-1">Transfer dan upload bukti untuk aktivasi akun</p>
          </div>

          {!uploadDone ? (
            <div className="space-y-4">
              {/* Info rekening */}
              <div className="bg-purple-950 border border-purple-800 rounded-2xl p-6">
                <p className="text-purple-300 text-xs font-medium mb-4 uppercase tracking-wide">Rekening Tujuan</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Bank</span>
                    <span className="text-white font-medium">{bankInfo?.bank_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Nomor Rekening</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium font-mono">{bankInfo?.bank_account}</span>
                      <button onClick={() => copyToClipboard(bankInfo?.bank_account || '')} className="text-purple-400 hover:text-purple-300">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Atas Nama</span>
                    <span className="text-white font-medium">{bankInfo?.bank_holder}</span>
                  </div>
                  <div className="border-t border-purple-800 pt-3 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Jumlah Transfer</span>
                    <span className="text-purple-300 font-semibold text-lg">Rp {harga}</span>
                  </div>
                </div>
              </div>

              {/* Upload bukti */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <p className="text-white text-sm font-medium mb-4">Upload Bukti Transfer</p>

                {error && (
                  <div className="flex gap-2 bg-red-950 border border-red-800 rounded-xl p-3 mb-4">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nama Bank Pengirim</label>
                    <select
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      {['BCA','BRI','BNI','Mandiri','BSI','CIMB Niaga','Jenius','GoPay','OVO','Dana'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Foto Bukti Transfer (JPG/PNG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setProofFile(e.target.files?.[0] || null)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-purple-700 file:text-white file:text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleUploadProof}
                    disabled={uploading || !proofFile}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {uploading ? 'Mengupload...' : 'Upload Bukti Transfer'}
                  </button>
                </div>
              </div>

              {/* WA Admin */}
              {bankInfo?.whatsapp_admin && (
                <p className="text-center text-xs text-gray-500">
                  Atau konfirmasi via WhatsApp:{' '}
                  <a
                    href={`https://wa.me/${bankInfo.whatsapp_admin}?text=Halo admin, saya sudah transfer untuk aktivasi akun Suara Cerdas. Email: ${form.email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
                  >
                    Chat Admin
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-950 mb-4">
                <CheckCircle2 className="text-green-400" size={28} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Bukti Transfer Diterima!</h3>
              <p className="text-gray-400 text-sm mb-6">
                Admin akan mengkonfirmasi pembayaran Anda dalam <strong className="text-white">1×24 jam</strong>.
                Akun akan langsung aktif setelah dikonfirmasi.
              </p>
              {bankInfo?.whatsapp_admin && (
                <a
                  href={`https://wa.me/${bankInfo.whatsapp_admin}?text=Halo admin, saya sudah upload bukti transfer. Email: ${form.email}. Mohon dikonfirmasi.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors mb-4"
                >
                  Hubungi Admin via WhatsApp
                </a>
              )}
              <div className="pt-4 border-t border-gray-800">
                <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 text-sm">
                  Kembali ke halaman login →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 mb-4">
            <Mic2 className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-white">Daftar Suara Cerdas</h1>
          <p className="text-gray-400 text-sm mt-1">Bayar sekali, pakai selamanya — Rp 89.000</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && (
            <div className="flex items-start gap-3 bg-red-950 border border-red-800 rounded-xl p-4 mb-6">
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Nama Lengkap</label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Nama Anda"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@contoh.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Nomor WhatsApp</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 pr-12"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Kode Referral (opsional)</label>
              <input
                type="text"
                value={form.referralCode}
                onChange={e => setForm(p => ({ ...p, referralCode: e.target.value.toUpperCase() }))}
                placeholder="Kode dari teman"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Mendaftarkan...' : 'Daftar & Lanjut ke Pembayaran'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-400">
              Sudah punya akun?{' '}
              <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
