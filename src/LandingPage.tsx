import { ArrowRight, ShieldCheck, Zap, Headphones, ShoppingBag, UserRound, LockKeyhole } from 'lucide-react'

type LandingPageProps = {
  onStartShopping: () => void
  onCustomerLogin: () => void
  onAdminLogin: () => void
}

export default function LandingPage({
  onStartShopping,
  onCustomerLogin,
  onAdminLogin,
}: LandingPageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-slate-800">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <Zap size={23} fill="currentColor" />
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">LukingzzStore</p>
            <p className="text-xs text-slate-500">Toko saldo digital</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCustomerLogin}
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
        >
          Masuk
        </button>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 md:grid-cols-2 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute -right-28 -top-16 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Selamat datang di LukingzzStore
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Kebutuhan digital, <span className="text-blue-600">lebih mudah</span> dalam satu tempat.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
            Temukan layanan saldo digital, pulsa, game, dan layanan lainnya melalui toko LukingzzStore.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartShopping}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Mulai Belanja <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={onCustomerLogin}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              <UserRound size={18} /> Login Pelanggan
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" /> Pembayaran diverifikasi admin</span>
            <span className="inline-flex items-center gap-2"><Headphones size={16} className="text-blue-600" /> Bantuan admin</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 blur-xl" />
          <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-blue-100/80 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-bold text-slate-800">Layanan Digital</p>
                <p className="mt-1 text-xs text-slate-400">Pilih layanan saat mulai belanja</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600"><ShoppingBag size={22} /></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'E-Wallet', desc: 'Saldo digital', icon: '₿', color: 'bg-sky-50 text-sky-700' },
                { label: 'Pulsa', desc: 'Isi ulang pulsa', icon: '▰', color: 'bg-orange-50 text-orange-700' },
                { label: 'Game', desc: 'Top up game', icon: '✦', color: 'bg-violet-50 text-violet-700' },
                { label: 'Layanan lain', desc: 'Lihat di toko', icon: '＋', color: 'bg-emerald-50 text-emerald-700' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-black ${item.color}`}>{item.icon}</div>
                  <p className="text-sm font-bold text-slate-800">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
              <div className="rounded-xl bg-white p-2.5 text-blue-600"><ShieldCheck size={20} /></div>
              <div>
                <p className="text-xs font-bold text-blue-900">Pembayaran QRIS</p>
                <p className="mt-1 text-[11px] leading-4 text-blue-700">Pembayaran diperiksa secara manual oleh admin.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><ShoppingBag size={20} /></div><div><p className="text-sm font-bold">Pilihan layanan</p><p className="text-xs text-slate-500">Lihat katalog di halaman toko</p></div></div>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><ShieldCheck size={20} /></div><div><p className="text-sm font-bold">Verifikasi pembayaran</p><p className="text-xs text-slate-500">Diperiksa oleh admin</p></div></div>
          <div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-3 text-amber-600"><Headphones size={20} /></div><div><p className="text-sm font-bold">Bantuan</p><p className="text-xs text-slate-500">Hubungi admin melalui toko</p></div></div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:px-8">
        <p>© {new Date().getFullYear()} LukingzzStore. Toko saldo digital.</p>
        <button type="button" onClick={onAdminLogin} className="inline-flex items-center gap-2 font-medium transition hover:text-blue-700">
          <LockKeyhole size={14} /> Login Admin
        </button>
      </footer>
    </main>
  )
}
