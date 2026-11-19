
import {
  ArrowRight,
  ShieldCheck,
  Headphones,
  ShoppingBag,
  UserRound,
  LockKeyhole,
} from 'lucide-react'

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
  const services = [
    {
      label: 'E-Wallet',
      desc: 'Isi saldo digital',
      icon: '\u{1F4B3}',
      color: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Pulsa & Data',
      desc: 'Isi ulang nomor Anda',
      icon: '\u{1F4F1}',
      color: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'Game',
      desc: 'Top up game favorit',
      icon: '\u{1F3AE}',
      color: 'bg-violet-50 text-violet-700',
    },
    {
      label: 'Layanan Lainnya',
      desc: 'Temukan pilihan lain',
      icon: '\uFF0B',
      color: 'bg-emerald-50 text-emerald-700',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Tentukan Layanan',
      description:
        'Pilih kebutuhan digital yang ingin Anda beli dari katalog NEXIPAY.',
    },
    {
      number: '02',
      title: 'Lengkapi Detail',
      description:
        'Masukkan nomor tujuan atau ID pelanggan sesuai layanan pilihan Anda.',
    },
    {
      number: '03',
      title: 'Selesaikan Pembayaran',
      description:
        'Gunakan saldo akun atau QRIS sesuai metode pembayaran yang tersedia.',
    },
    {
      number: '04',
      title: 'Tunggu Pesanan Selesai',
      description:
        'Pembayaran diperiksa dan pesanan diproses. Pantau statusnya melalui akun Anda.',
    },
  ]

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9fc] text-slate-800">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/images/nexipay-logo.png"
            alt="Logo NEXIPAY"
            className="h-12 w-12 rounded-xl object-cover object-[center_25%]"
          />
          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-950">
              NEXIPAY
            </p>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500">
              DIGITAL COMMERCE
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCustomerLogin}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
        >
          Masuk
        </button>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 md:grid-cols-2 md:pb-24 md:pt-20">
        <div className="pointer-events-none absolute -right-28 -top-16 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-semibold tracking-wide text-blue-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            LAYANAN DIGITAL, TANPA RIBET
          </div>

          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Satu tempat untuk berbagai{' '}
            <span className="text-blue-600">kebutuhan digital.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
            Isi saldo, beli pulsa, paket data, hingga top up game. Temukan
            berbagai kebutuhan digital Anda dalam satu platform.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onStartShopping}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Jelajahi Layanan <ArrowRight size={18} />
            </button>

            <button
              type="button"
              onClick={onCustomerLogin}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
            >
              <UserRound size={18} /> Masuk ke Akun
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-600" />
              Pembayaran diperiksa
            </span>
            <span className="inline-flex items-center gap-2">
              <Headphones size={16} className="text-blue-600" />
              Dukungan admin
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 blur-xl" />

          <div className="relative rounded-[2rem] border border-white bg-white p-5 shadow-2xl shadow-blue-100/80 sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Kebutuhan Digital Anda
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Pilih sesuai kebutuhan
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <ShoppingBag size={22} />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {services.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-xl ${item.color}`}
                  >
                    {item.icon}
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-blue-50 p-4">
              <div className="rounded-xl bg-white p-2.5 text-blue-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900">
                  Pembayaran QRIS
                </p>
                <p className="mt-1 text-[11px] leading-4 text-blue-700">
                  Pembayaran diperiksa oleh admin sebelum pesanan diproses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Banyak pilihan</p>
              <p className="text-xs text-slate-500">
                Beragam kebutuhan digital
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Pembayaran diperiksa</p>
              <p className="text-xs text-slate-500">
                Verifikasi oleh admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <Headphones size={20} />
            </div>
            <div>
              <p className="text-sm font-bold">Bantuan pelanggan</p>
              <p className="text-xs text-slate-500">
                Dukungan melalui admin
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f9fc] px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Panduan Transaksi
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Dari Pilihan hingga Selesai
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              Empat langkah sederhana untuk memenuhi kebutuhan digital Anda
              melalui NEXIPAY.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-lg font-extrabold text-blue-600">
                  {step.number}
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:px-8">
        <p>
          {'\u00A9'} {new Date().getFullYear()} NEXIPAY. Solusi Transaksi Digital.
        </p>
        <button
          type="button"
          onClick={onAdminLogin}
          className="inline-flex items-center gap-2 font-medium transition hover:text-blue-700"
        >
          <LockKeyhole size={14} /> Akses Admin
        </button>
      </footer>
    </main>
  )
}
