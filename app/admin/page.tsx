'use client'
import { useState, useEffect } from 'react'
import { Users, DollarSign, Clock, TrendingUp, CheckCircle2, XCircle,
         LogOut, Search, RefreshCw, Eye, Ban, UserCheck, Loader2, Mic2 } from 'lucide-react'

interface Stats {
  totalMembers: number; activeMembers: number; pendingMembers: number
  totalRevenue: number; pendingPayments: number; monthlyGenerates: number; newMembersToday: number
}
interface Order {
  id: string; order_number: string; user_id: string; amount: number; status: string
  bank_name: string; transfer_proof_url: string; created_at: string
  users: { email: string; full_name: string; phone: string }
}
interface Member {
  id: string; email: string; full_name: string; phone: string; status: string
  daily_quota: number; daily_used: number; created_at: string; last_login_at: string
}
type Tab = 'stats' | 'payments' | 'members' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('payments')
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Settings state - controlled inputs
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [hargaLifetime, setHargaLifetime] = useState('')
  const [dailyQuota, setDailyQuota] = useState('')
  const [waAdmin, setWaAdmin] = useState('')
  const [geminiKey, setGeminiKey] = useState('')

  useEffect(() => {
    fetchStats()
    fetchOrders()
    fetchSettingsData()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchSettingsData() {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin?type=settings')
      if (res.ok) {
        const d = await res.json()
        const s = d.settings || {}
        setBankName(s.bank_name || '')
        setBankAccount(s.bank_account || '')
        setBankHolder(s.bank_holder || '')
        setHargaLifetime(s.harga_lifetime || '89000')
        setDailyQuota(s.daily_quota_default || '25')
        setWaAdmin(s.whatsapp_admin || '')
        setGeminiKey(s.gemini_api_key || '')
      }
    } catch(e) { console.error(e) }
    setSettingsLoading(false)
  }

  async function fetchStats() {
    const res = await fetch('/api/admin?type=stats')
    if (res.ok) { const d = await res.json(); setStats(d.stats) }
  }

  async function fetchOrders(status = 'paid') {
    setLoading(true)
    const res = await fetch(`/api/admin?type=orders&status=${status}`)
    if (res.ok) { const d = await res.json(); setOrders(d.orders) }
    setLoading(false)
  }

  async function fetchMembers() {
    setLoading(true)
    const params = new URLSearchParams({ type: 'members' })
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/admin?${params}`)
    if (res.ok) { const d = await res.json(); setMembers(d.members) }
    setLoading(false)
  }

  async function action(act: string, userId: string, orderId?: string, data?: Record<string, unknown>) {
    setActionLoading(orderId || userId)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, userId, orderId, data })
    })
    const result = await res.json()
    if (res.ok) {
      showToast(result.message || 'Berhasil!')
      fetchStats()
      if (tab === 'payments') fetchOrders()
      if (tab === 'members') fetchMembers()
    } else {
      showToast('Error: ' + result.error)
    }
    setActionLoading(null)
  }

  async function saveSettings() {
    setSettingsLoading(true)
    const data = {
      bank_name: bankName,
      bank_account: bankAccount,
      bank_holder: bankHolder,
      harga_lifetime: hargaLifetime,
      daily_quota_default: dailyQuota,
      whatsapp_admin: waAdmin,
      gemini_api_key: geminiKey,
    }
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_settings', userId: 'admin', data })
    })
    if (res.ok) {
      showToast('✅ Pengaturan berhasil disimpan!')
      fetchSettingsData() // reload dari DB
    } else {
      showToast('❌ Gagal simpan pengaturan')
    }
    setSettingsLoading(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

  return (
    <div className="min-h-screen bg-gray-950">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-purple-700 text-white px-5 py-3 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Mic2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-medium text-sm">Suara Cerdas</h1>
            <p className="text-purple-400 text-xs">Admin Panel</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <LogOut size={15} /> Keluar
        </button>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { id: 'payments', label: 'Konfirmasi Bayar', badge: stats?.pendingPayments },
            { id: 'members', label: 'Data Member', badge: stats?.totalMembers },
            { id: 'stats', label: 'Statistik' },
            { id: 'settings', label: 'Pengaturan' },
          ].map(t => (
            <button key={t.id}
              onClick={() => {
                setTab(t.id as Tab)
                if (t.id === 'members') fetchMembers()
                if (t.id === 'stats') fetchStats()
                if (t.id === 'settings') fetchSettingsData()
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
              {t.label}
              {t.badge !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-gray-700'}`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* STATS */}
        {tab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Member', value: stats.totalMembers, color: 'text-purple-400' },
                { label: 'Member Aktif', value: stats.activeMembers, color: 'text-green-400' },
                { label: 'Menunggu Konfirmasi', value: stats.pendingPayments, color: 'text-yellow-400' },
                { label: 'Baru Hari Ini', value: stats.newMembersToday, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-2xl font-semibold text-green-400">{fmtRp(stats.totalRevenue)}</div>
                <div className="text-xs text-gray-500 mt-1">Total pendapatan terkonfirmasi</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="text-2xl font-semibold text-purple-400">{stats.monthlyGenerates.toLocaleString('id-ID')}</div>
                <div className="text-xs text-gray-500 mt-1">Generate audio bulan ini</div>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {tab === 'payments' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {[['paid','Menunggu Konfirmasi'],['pending','Belum Bayar'],['confirmed','Sudah Dikonfirmasi']].map(([s,l]) => (
                <button key={s} onClick={() => fetchOrders(s)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
                  {l}
                </button>
              ))}
              <button onClick={() => fetchOrders()} className="ml-auto text-gray-500 hover:text-gray-300"><RefreshCw size={15} /></button>
            </div>
            {loading ? (
              <div className="text-center py-12 text-gray-600"><Loader2 className="animate-spin mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 text-gray-600 bg-gray-900 border border-gray-800 rounded-2xl">
                <Clock size={32} className="mx-auto mb-3 opacity-50" /><p>Tidak ada pembayaran</p>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-medium">{order.users?.full_name}</p>
                    <p className="text-gray-400 text-sm">{order.users?.email}</p>
                    {order.users?.phone && <p className="text-gray-500 text-xs">{order.users.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-purple-300 font-semibold">{fmtRp(order.amount)}</p>
                    <p className="text-gray-500 text-xs">{fmtDate(order.created_at)}</p>
                    <p className="text-gray-600 text-xs">{order.order_number}</p>
                  </div>
                </div>
                {order.bank_name && <p className="text-xs text-gray-500 mb-3">Bank: {order.bank_name}</p>}
                {order.transfer_proof_url && (
                  <div className="mb-4">
                    <a href={order.transfer_proof_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-gray-800 px-3 py-2 rounded-lg">
                      <Eye size={13} /> Lihat Bukti Transfer
                    </a>
                  </div>
                )}
                {order.status === 'paid' && (
                  <div className="flex gap-2">
                    <button onClick={() => action('confirm_payment', order.user_id!, order.id)}
                      disabled={actionLoading === order.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                      {actionLoading === order.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Konfirmasi & Aktifkan
                    </button>
                    <button onClick={() => { const r = prompt('Alasan penolakan:'); if (r) action('reject_payment', order.user_id!, order.id, { reason: r }) }}
                      className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-900 border border-gray-700 text-gray-300 text-sm px-4 py-2.5 rounded-xl transition-colors">
                      <XCircle size={14} /> Tolak
                    </button>
                  </div>
                )}
                {order.status === 'confirmed' && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle2 size={14} /> Sudah dikonfirmasi
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MEMBERS */}
        {tab === 'members' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMembers()}
                  placeholder="Cari email member..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500" />
              </div>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchMembers() }}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none">
                <option value="">Semua</option>
                <option value="active">Aktif</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <button onClick={fetchMembers} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl">Cari</button>
            </div>
            {loading ? <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-600" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="text-left">
                    <th className="text-xs text-gray-500 font-medium pb-3 pr-4">Member</th>
                    <th className="text-xs text-gray-500 font-medium pb-3 pr-4">Status</th>
                    <th className="text-xs text-gray-500 font-medium pb-3 pr-4">Kuota</th>
                    <th className="text-xs text-gray-500 font-medium pb-3 pr-4">Daftar</th>
                    <th className="text-xs text-gray-500 font-medium pb-3">Aksi</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    {members.map(m => (
                      <tr key={m.id}>
                        <td className="py-3 pr-4">
                          <div className="text-sm text-white font-medium">{m.full_name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${m.status==='active'?'bg-green-950 text-green-400':m.status==='pending'?'bg-yellow-950 text-yellow-400':'bg-red-950 text-red-400'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-400">{m.daily_used}/{m.daily_quota}</td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{fmtDate(m.created_at)}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {m.status==='active' ? (
                              <button onClick={() => action('suspend_user', m.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><Ban size={12}/> Suspend</button>
                            ) : m.status==='pending' ? (
                              <button onClick={() => action('confirm_payment', m.id)} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"><UserCheck size={12}/> Aktifkan</button>
                            ) : m.status==='suspended' ? (
                              <button onClick={() => action('activate_user', m.id)} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"><UserCheck size={12}/> Aktifkan</button>
                            ) : null}
                            <button onClick={() => { const q=prompt('Set kuota harian:',String(m.daily_quota)); if(q&&!isNaN(parseInt(q))) action('set_quota',m.id,undefined,{quota:parseInt(q)}) }}
                              className="text-xs text-purple-400 hover:text-purple-300">Kuota</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {members.length === 0 && <div className="text-center py-12 text-gray-600">Tidak ada member</div>}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-4">
            {settingsLoading && (
              <div className="text-center py-4 text-gray-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Memuat pengaturan...
              </div>
            )}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-medium mb-4">Rekening Bank</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nama Bank</label>
                  <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BCA"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nomor Rekening</label>
                  <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} placeholder="7370303210"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Atas Nama</label>
                  <input value={bankHolder} onChange={e => setBankHolder(e.target.value)} placeholder="Ary Setiawan"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-medium mb-4">Konfigurasi Produk</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Harga Lifetime (Rp)</label>
                  <input value={hargaLifetime} onChange={e => setHargaLifetime(e.target.value)} placeholder="89000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Kuota Harian Default</label>
                  <input value={dailyQuota} onChange={e => setDailyQuota(e.target.value)} placeholder="25"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">WhatsApp Admin</label>
                  <input value={waAdmin} onChange={e => setWaAdmin(e.target.value)} placeholder="6285764189033"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Gemini API Key</label>
                  <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AQ.xxx atau AIzaSy..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>

            <button onClick={saveSettings} disabled={settingsLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              {settingsLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Simpan Semua Pengaturan
            </button>

            <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 text-xs text-amber-300">
              ⚠️ Setelah simpan, data langsung tersimpan ke database dan berlaku untuk semua member.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
