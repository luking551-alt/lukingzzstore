
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import {
  QrCode, Camera, CameraOff, RefreshCw, AlertCircle,
  CheckCircle2, ImagePlus, Send, Loader2
} from 'lucide-react'

type QrisScannerProps = {
  userToken: string | null
  onSubmitted: () => Promise<void> | void
}

type QrisDetails = {
  merchant: string
  city: string
  amount: string
  currency: string
}

const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export default function QrisScanner({ userToken, onSubmitted }: QrisScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const runningRef = useRef(false)

  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [details, setDetails] = useState<QrisDetails | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const parseQRIS = (payload: string): QrisDetails => {
    const fields: Record<string, string> = {}
    let position = 0

    while (position + 4 <= payload.length) {
      const tag = payload.substring(position, position + 2)
      const length = Number(payload.substring(position + 2, position + 4))

      if (!/^\d{2}$/.test(tag) || !Number.isFinite(length)) break

      const valueStart = position + 4
      const valueEnd = valueStart + length
      if (valueEnd > payload.length) break

      fields[tag] = payload.substring(valueStart, valueEnd)
      position = valueEnd
    }

    return {
      merchant: fields['59'] || 'Tidak terbaca',
      city: fields['60'] || 'Tidak terbaca',
      amount: fields['54'] || '',
      currency: fields['53'] === '360' ? 'IDR' : fields['53'] || '-',
    }
  }

  const handleScanResult = (payload: string) => {
    const parsed = parseQRIS(payload)
    setResult(payload)
    setDetails(parsed)
    setAmount(parsed.amount ? String(Math.round(Number(parsed.amount))) : '')
    setNote('')
    setError('')
    setSuccessMessage('')
  }

  const stopScanner = async () => {
    const scanner = scannerRef.current
    if (!scanner || !runningRef.current) return

    runningRef.current = false
    setScanning(false)

    try {
      await scanner.stop()
    } catch {
      // Kamera mungkin sudah berhenti.
    }
  }

  const scanImage = async (file: File) => {
    setError('')
    setSuccessMessage('')

    try {
      const scanner = new Html5Qrcode('qris-reader')
      const decodedText = await scanner.scanFile(file, true)
      handleScanResult(decodedText)
    } catch {
      setError('QRIS tidak ditemukan. Pastikan gambar jelas dan kode QR terlihat utuh.')
    }
  }

  const startScanner = async () => {
    setError('')
    setSuccessMessage('')

    try {
      const scanner = new Html5Qrcode('qris-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          handleScanResult(decodedText)
          await stopScanner()
        },
        () => {}
      )

      runningRef.current = true
      setScanning(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat dibuka. Periksa izin kamera perangkat.'
      )
    }
  }

  const submitRequest = async () => {
    if (!userToken) {
      setError('Silakan login terlebih dahulu untuk mengajukan pembayaran.')
      return
    }

    if (!details || !result) return

    if (details.merchant === 'Tidak terbaca') {
      setError('Nama merchant tidak terbaca. Silakan gunakan QRIS dengan data merchant yang jelas.')
      return
    }

    if (details.currency !== 'IDR') {
      setError('QRIS ini tidak terdeteksi menggunakan mata uang Rupiah (IDR).')
      return
    }

    const numericAmount = Number(amount)

    if (!Number.isSafeInteger(numericAmount) || numericAmount < 1000 || numericAmount > 100000000) {
      setError('Nominal harus berupa angka bulat antara Rp1.000 sampai Rp100.000.000.')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(`${API_URL}/api/users/qris-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          merchant_name: details.merchant,
          merchant_city: details.city === 'Tidak terbaca' ? '' : details.city,
          qris_payload: result,
          amount: numericAmount,
          currency: 'IDR',
          customer_note: note.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Pengajuan pembayaran gagal dikirim.')
      }

      setSuccessMessage('Pengajuan berhasil dikirim. Saldo kamu ditahan sementara sampai admin memproses permintaan.')
      setAmount('')
      setNote('')
      await onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim pengajuan.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current
      if (scanner && runningRef.current) {
        runningRef.current = false
        scanner.stop().catch(() => {})
      }
    }
  }, [])

  const encodedAmount = Boolean(details?.amount)

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white">
        <div className="mb-3 flex items-center gap-3">
          <QrCode size={30} />
          <div>
            <h2 className="text-lg font-bold">Scan & Ajukan Pembayaran QRIS</h2>
            <p className="text-xs text-blue-100">Pindai QRIS merchant untuk mengajukan pembayaran</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-blue-100">
          
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Kamera Scanner</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${scanning ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {scanning ? 'Kamera aktif' : 'Kamera tidak aktif'}
          </span>
        </div>

        <div id="qris-reader" className="min-h-[280px] overflow-hidden rounded-xl bg-slate-950" />

        <div className="mt-4 flex gap-2">
          {!scanning ? (
            <button
              type="button"
              onClick={startScanner}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800"
            >
              <Camera size={18} />
              Mulai Scan
            </button>
          ) : (
            <button
              type="button"
              onClick={stopScanner}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700"
            >
              <CameraOff size={18} />
              Hentikan Kamera
            </button>
          )}
        </div>

        <div className="mt-3">
          <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            <ImagePlus size={18} />
            Pilih Gambar QRIS
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) scanImage(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>

        {error && (
          <div className="mt-3 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={17} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 flex gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-700">
            <CheckCircle2 size={17} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {result && details && (
        <div className="space-y-4 rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={20} />
            <h3 className="font-bold">QR berhasil dibaca</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3 border-b pb-2">
              <span className="text-slate-500">Nama merchant</span>
              <strong className="text-right">{details.merchant}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b pb-2">
              <span className="text-slate-500">Kota</span>
              <strong className="text-right">{details.city}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b pb-2">
              <span className="text-slate-500">Nominal QRIS</span>
              <strong className="text-right">{encodedAmount ? `Rp ${Number(details.amount).toLocaleString('id-ID')}` : 'Tidak ditentukan'}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b pb-2">
              <span className="text-slate-500">Mata uang</span>
              <strong className="text-right">{details.currency}</strong>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Nominal pembayaran (Rp)</label>
            <input
              type="number"
              min="1000"
              max="100000000"
              step="1"
              value={amount}
              readOnly={encodedAmount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Masukkan nominal pembayaran"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />
            {encodedAmount && (
              <p className="mt-1 text-xs text-slate-500">Nominal mengikuti nilai yang tertanam di QRIS.</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Catatan untuk admin (opsional)</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Contoh: pembayaran pesanan di toko..."
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {!userToken && (
            <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              Login terlebih dahulu untuk mengajukan pembayaran QRIS.
            </p>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            Saldo NEXIPAY akan ditahan saat pengajuan dikirim. Jika ditolak, saldo dikembalikan. Jika admin menyelesaikan pembayaran setelah benar-benar membayar merchant, saldo menjadi terpotong permanen.
          </div>

          <button
            type="button"
            onClick={submitRequest}
            disabled={!userToken || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? 'Mengirim pengajuan...' : 'Ajukan Pembayaran'}
          </button>

          <button
            type="button"
            onClick={() => {
              setResult('')
              setDetails(null)
              setAmount('')
              setNote('')
              setError('')
              setSuccessMessage('')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
          >
            <RefreshCw size={16} />
            Scan QR Berikutnya
          </button>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-600">Data QR mentah</p>
            <textarea
              readOnly
              value={result}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
        <strong>Perhatian:</strong> Pasang QRIS yang valid dan jelas. Pastikan QRIS berasal dari merchant resmi dan bukan hasil editan.
      </div>
    </div>
  )
}

