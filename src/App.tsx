// @ts-nocheck
import { useEffect, useState, type FormEvent } from 'react'
import {
  Wallet, Search, Bell, ChevronRight, ArrowDownUp, Clock, ShieldCheck, Zap,
  Home, ReceiptText, UserRound, CircleHelp, LockKeyhole, LogOut, LayoutDashboard,
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, ClipboardList, PackageCheck,
  Package, Plus, Pencil, X, Layers, UserPlus, Coins, Users, ArrowUpFromLine
} from 'lucide-react'
// @ts-ignore
import Slot from './Slot';
import LandingPage from './LandingPage';

const API_URL = ''
const QRIS_IMAGE_URL = '/images/qris-dana.png'

const CATEGORY_ORDER = ['E-Wallet', 'Pulsa', 'Game', 'Layanan Lainnya'] as const
type CategoryName = (typeof CATEGORY_ORDER)[number]

const CATEGORY_MAP: Record<string, CategoryName> = {
  DANA: 'E-Wallet', OVO: 'E-Wallet', GOPAY: 'E-Wallet', SHOPEEPAY: 'E-Wallet',
  AXIS: 'Pulsa', INDOSAT: 'Pulsa', SMARTFREN: 'Pulsa', TELKOMSEL: 'Pulsa', TRI: 'Pulsa', XL: 'Pulsa',
  'FREE FIRE': 'Game', 'GENSHIN IMPACT': 'Game', 'MOBILE LEGENDS': 'Game', 'PUBG MOBILE': 'Game', ROBLOX: 'Game',
  PLN: 'Layanan Lainnya', 'GOOGLE PLAY': 'Layanan Lainnya', BANKTRANSFER: 'Layanan Lainnya', 'TRANSFER ALL BANK': 'Layanan Lainnya',
}

const PRODUCT_COLORS = [
  'bg-sky-500', 'bg-purple-600', 'bg-blue-600', 'bg-orange-500', 'bg-rose-500',
  'bg-emerald-600', 'bg-indigo-600', 'bg-teal-600', 'bg-fuchsia-600', 'bg-amber-600',
]

function getCategoryForProduct(product: ApiProduct): CategoryName {
  const byCode = CATEGORY_MAP[String(product.code || '').toUpperCase()]
  if (byCode) return byCode
  const byName = CATEGORY_MAP[String(product.name || '').toUpperCase()]
  if (byName) return byName
  return 'Lainnya'
}

function getProductColor(product: ApiProduct) {
  const source = String(product.code || product.name || '?')
  let hash = 0
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) >>> 0
  return PRODUCT_COLORS[hash % PRODUCT_COLORS.length]
}

function getProductSymbol(product: ApiProduct) {
  const LOGO_MAP: Record<string, string> = {
    DANA: '/images/dana.png', OVO: '/images/ovo.png', GOPAY: '/images/gopay.png', SHOPEEPAY: '/images/shopeepay.png',
    AXIS: '/images/axis.png', INDOSAT: '/images/indosat.png', SMARTFREN: '/images/smartfren.png', TELKOMSEL: '/images/telkomsel.png', TRI: '/images/tri.png', XL: '/images/xl.png',
    'FREE FIRE': '/images/freefire.png', 'MOBILE LEGENDS': '/images/mobilelegends.png', 'PUBG MOBILE': '/images/pubg.png', 'GENSHIN IMPACT': '/images/genshinimpact.png', ROBLOX: '/images/roblox.png', 'GOOGLE PLAY': '/images/googleplay.png', PLN: '/images/pln.png',
    BANKTRANSFER: '/images/kartu.png',
  }
  
  const code = String(product.code || '').toUpperCase().replace(/\s+/g, '')
  const name = String(product.name || '').toUpperCase().replace(/\s+/g, '')

  if (code === 'FREEFIRE' || name === 'FREEFIRE') return '/images/freefire.png'
  if (code === 'MOBILELEGENDS' || name === 'MOBILELEGENDS') return '/images/mobilelegends.png'
  if (code === 'PUBG' || code === 'PUBGMOBILE' || name === 'PUBGMOBILE') return '/images/pubg.png'
  if (code === 'GENSHIN' || code === 'GENSHINIMPACT' || name === 'GENSHINIMPACT') return '/images/genshinimpact.png'
  if (code === 'GOOGLEPLAY' || name === 'GOOGLEPLAY') return '/images/googleplay.png'
  if (code === 'ROBLOX' || name === 'ROBLOX') return '/images/roblox.png'
  if (code === 'PLN' || name === 'PLN') return '/images/pln.png'

  if (LOGO_MAP[String(product.code || '').toUpperCase()]) return LOGO_MAP[String(product.code || '').toUpperCase()]
  
  const source = String(product.name || product.code || '?').trim()
  return source.charAt(0).toUpperCase() || '?'
}

function renderProductIcon(item: ApiProduct) {
  const symbol = getProductSymbol(item);
  if (symbol.startsWith('/')) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <img src={symbol} alt={item.name} className="h-full w-full object-cover" onError={(e) => {
          const target = e.currentTarget; target.style.display = 'none';
          target.parentElement!.innerHTML = `<span class="flex h-full w-full items-center justify-center ${getProductColor(item)} text-xl font-black text-white">${item.name.charAt(0).toUpperCase()}</span>`;
        }} />
      </div>
    );
  }
  return (
    <span className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${getProductColor(item)} text-xl font-black text-white shadow-sm`}>
      {symbol}
    </span>
  );
}

type ApiVariant = { id: string; variant_name: string; code: string; description: string | null; selling_price: number }
type ApiProduct = { id: string; name: string; code: string; description: string | null; variants: ApiVariant[] }
type AdminVariant = { id: string; variant_name: string; code: string; description: string | null; cost_price: number; selling_price: number; is_active: boolean; created_at: string; updated_at: string }
type AdminProduct = { id: string; name: string; code: string; description: string | null; is_active: boolean; created_at: string; updated_at: string; variants: AdminVariant[] }
type UserProfile = { id: string; phone: string; full_name: string | null; is_active?: boolean; created_at?: string }

type CreatedOrder = { order_number: string; tracking_token: string; product: string; destination_number: string; amount: number; service_fee: number; total_amount: number; order_status: string; payment_status: string; payment_method: string }
type TrackedOrder = { order_number: string; customer_name: string | null; destination_number: string; amount: number; service_fee: number; total_amount: number; order_status: string; created_at: string; updated_at: string; product_name: string | null; payment_method: string | null; payment_status: string | null }
type AdminOrder = { id: string; order_number: string; customer_name: string | null; customer_phone: string; destination_number: string; amount: number; service_fee: number; total_amount: number; order_status: string; created_at: string; product_name: string; product_code: string; payment_method: string; expected_amount: number; received_amount: number | null; payment_status: string; verified_at: string | null; transaction_reference: string | null }
type UserOrder = { id: string; order_number: string; tracking_token: string; variant_name_snapshot: string | null; destination_number: string; amount: number; service_fee: number; total_amount: number; order_status: string; created_at: string; updated_at: string; product_name: string | null; product_code: string | null; payment_method: string | null; payment_status: string | null; expected_amount: number | null; received_amount: number | null; verified_at: string | null }

type WithdrawRequest = {
  id: string
  amount: number
  bank_name: string
  account_number: string
  account_name: string
  status: string
  created_at: string
  phone: string
  full_name: string | null
}

type CustomerTab = 'home' | 'orders' | 'track' | 'account'
type UserPage = 'main' | 'login' | 'register'
type AdminTab = 'orders' | 'products' | 'users' | 'withdraws'

const USER_TOKEN_KEY = 'digitalku_user_token'

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { pending: 'Menunggu', paid: 'Sudah dibayar', processing: 'Diproses', completed: 'Selesai', failed: 'Gagal', cancelled: 'Dibatalkan', verified: 'Terverifikasi', rejected: 'Ditolak', expired: 'Kedaluwarsa' }
  return labels[status] || status || '-'
}

function statusColor(status: string) {
  if (['completed', 'verified'].includes(status)) return 'bg-emerald-100 text-emerald-700'
  if (['failed', 'rejected', 'cancelled', 'expired'].includes(status)) return 'bg-red-100 text-red-700'
  if (['processing', 'paid'].includes(status)) return 'bg-blue-100 text-blue-700'
  return 'bg-amber-100 text-amber-700'
}

// =====================================================
// WHATSAPP FLOATING BUTTON
// =====================================================
const ADMIN_WA_NUMBER = '6281356682926'

function WhatsappButton() {
  const link = `https://t.me/LukingzzStoreBot`
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[#229ED9] p-2 text-white">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-800">Hubungi Admin</h3>
          <p className="mt-0.5 text-xs text-emerald-700">Chat via Telegram</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-emerald-600" />
    </a>
  )
}

function QrisPayment({ totalAmount, orderNumber }: { totalAmount: number; orderNumber: string }) {
  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"><Wallet size={15} />PEMBAYARAN QRIS</div>
        <h3 className="mt-3 text-lg font-extrabold text-slate-800">Scan untuk membayar</h3>
        <p className="mt-1 text-xs text-slate-500">Gunakan aplikasi pembayaran yang mendukung QRIS.</p>
      </div>
      <div className="mx-auto mt-4 max-w-[280px] rounded-xl border border-slate-200 bg-white p-3">
        <img src={QRIS_IMAGE_URL} alt="QRIS DANA Bisnis LukingzzStore" className="mx-auto aspect-square w-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      </div>
      <div className="mt-4 rounded-xl bg-blue-50 p-4 text-center">
        <p className="text-xs font-medium text-blue-700">TOTAL YANG HARUS DIBAYAR</p>
        <p className="mt-1 text-2xl font-extrabold text-blue-800">{formatRupiah(totalAmount)}</p>
        <p className="mt-2 text-[11px] leading-5 text-blue-700">Jika aplikasi meminta nominal pembayaran, masukkan nominal sesuai total di atas.</p>
      </div>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-bold text-amber-800">Petunjuk pembayaran</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-xs leading-5 text-amber-800">
          <li>Buka aplikasi pembayaran yang mendukung QRIS.</li><li>Pilih menu Scan QRIS.</li><li>Pindai gambar QRIS di atas.</li><li>Periksa nama penerima dan nominal pembayaran.</li><li>Selesaikan pembayaran jika semua informasi benar.</li><li>Simpan bukti transaksi untuk catatan pribadi.</li>
        </ol>
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p className="font-bold text-slate-700">Nomor pesanan: {orderNumber}</p>
        <p className="mt-1">Pesanan akan diproses setelah admin memeriksa dan memverifikasi pembayaran yang benar-benar masuk ke DANA Bisnis.</p>
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-blue-700" /><p className="text-[11px] leading-5 text-blue-800">Verifikasi pembayaran dilakukan secara manual oleh admin. Sistem belum mendeteksi pembayaran secara otomatis.</p>
      </div>
      <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">Jangan melanjutkan pembayaran apabila nama penerima yang muncul tidak sesuai dengan pemilik QRIS.</p>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<'landing' | 'store' | 'login' | 'dashboard' | 'admin' | 'slot'>(() => {
    // Pengunjung baru melihat Landing Page. Jika sebelumnya sudah masuk toko,
    // pertahankan halaman toko ketika browser di-refresh.
    try {
      const savedPage = sessionStorage.getItem('digitalku_current_page')
return savedPage === 'store' ? 'store' : 'landing'
    } catch {
      return 'landing'
    }
  })

  useEffect(() => {
    // Simpan hanya pilihan halaman publik; halaman admin tetap mengikuti sesi admin.
    try {
      if (page === 'landing' || page === 'store') {
        sessionStorage.setItem('digitalku_current_page', page)
      }
    } catch {
      // Abaikan jika penyimpanan browser tidak tersedia.
    }
  }, [page])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [phone, setPhone] = useState('')
  const [transferBank, setTransferBank] = useState('BCA')
  const [transferAccountNumber, setTransferAccountNumber] = useState('')
  const [transferAccountName, setTransferAccountName] = useState('')
  const [transferAmount, setTransferAmount] = useState('10000')
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'saldo'>('qris')
  const [message, setMessage] = useState('')
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
    // State untuk Hadiah (Rewards)
  const [rewards, setRewards] = useState<any[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [redeemId, setRedeemId] = useState<string | null>(null)
  const [redeemDestination, setRedeemDestination] = useState('')
  const [isRedeeming, setIsRedeeming] = useState(false)
  // State untuk Notifikasi Sosial (Social Proof)
  const [socialProof, setSocialProof] = useState<{ name: string; action: string; time: string } | null>(null)

  // Data Ilusi Pengguna
  const fakeUsers = [
    { name: 'Andre', action: 'baru saja Top Up 70 Diamond FF' },
    { name: 'Siti***', action: 'baru saja membeli Pulsa Telkomsel 50.000' },
    { name: 'Andi***', action: 'baru saja menukar 100 Poin dengan 70 Diamond' },
    { name: 'Rina***', action: 'baru saja Top Up DANA Rp 100.000' },
    { name: 'Joko***', action: 'baru saja membeli 140 Diamond Free Fire' },
    { name: 'Dewi***', action: 'baru saja membeli Token PLN Rp 100.000' },
    { name: 'Agus***', action: 'baru saja menukar 250 Poin dengan 140 Diamond' },
    { name: 'ASMAR', action: 'baru saja menukar 5000 Poin dengan 720 Diamond' },
     { name: 'Putri***', action: 'baru saja Top Up OVO Rp 50.000' },
    { name: 'Hendra***', action: 'baru saja Transfer Bank BCA Rp 200.000' },
    { name: 'Lestari***', action: 'baru saja membeli 355 Diamond FF' },
    { name: 'Fajar***', action: 'baru saja membeli Pulsa Indosat 10.000' },
    { name: 'Indah***', action: 'baru saja membeli Pulsa Indosat 25.000' },
    { name: 'Bayu***', action: 'baru saja Top Up 720 Diamond Free Fire' },
    { name: 'Sari***', action: 'baru saja membeli Voucher Google Play Rp 50.000' },
    { name: 'Rizky***', action: 'baru saja Transfer All Bank BRI Rp 150.000' },
    { name: 'ALDI', action: 'baru saja Membeli Pulsa Telkomsel 100.000' },
  ]
   // ==================================
  const [activeTab, setActiveTab] = useState<CustomerTab>('home')
  // State untuk Banner Bergulir
  const [currentBanner, setCurrentBanner] = useState(0)
  const banners = ['/images/banner1.jpg', '/images/banner2.jpg', '/images/banner3.jpg', '/images/banner4.jpg']

  // Efek Otomatis Bergulir
  useEffect(() => {
    if (page !== 'store' || activeTab !== 'home') return
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [page, activeTab, banners.length])
    useEffect(() => {
    if (page !== 'store') return

    const interval = setInterval(() => {
      const randomUser = fakeUsers[Math.floor(Math.random() * fakeUsers.length)]
      const randomTime = Math.floor(Math.random() * 5) + 1
      
      setSocialProof({
        name: randomUser.name,
        action: randomUser.action,
        time: `${randomTime} menit lalu`
      })

      setTimeout(() => {
        setSocialProof(null)
      }, 4000)

    }, 8000)

    return () => clearInterval(interval)
  }, [page])
  const [userPage, setUserPage] = useState<UserPage>('main')
  const [adminTab, setAdminTab] = useState<AdminTab>('orders')

  const [userToken, setUserToken] = useState<string | null>(() => { try { return localStorage.getItem(USER_TOKEN_KEY) } catch { return null } })
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userAuthMode, setUserAuthMode] = useState<'login' | 'register'>('login')
  const [userForm, setUserForm] = useState({ phone: '', password: '', full_name: '' })
  const [userFormError, setUserFormError] = useState('')
  const [isUserSubmitting, setIsUserSubmitting] = useState(false)
const [referralCode, setReferralCode] = useState('')
  const [userOrders, setUserOrders] = useState<UserOrder[]>([])
  const [userOrdersLoading, setUserOrdersLoading] = useState(false)
  const [userOrdersError, setUserOrdersError] = useState('')

  const [userBalance, setUserBalance] = useState<number>(0)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [isTopupOpen, setIsTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState<number>(50000)
  const [topupQrisData, setTopupQrisData] = useState<{ id: string, amount: number } | null>(null)

  // WITHDRAW STATE
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bank_name: '', account_number: '', account_name: '' })
  const [withdrawError, setWithdrawError] = useState('')
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false)

  const [missionData, setMissionData] = useState<{ total_transactions: number; target_transactions: number; has_claimed: boolean; can_claim: boolean } | null>(null)
  const [claimingMission, setClaimingMission] = useState(false)
  const [missionLevel2Data, setMissionLevel2Data] = useState<{ total_transactions: number; target_transactions: number; bonus_amount: number; has_claimed: boolean; can_claim: boolean } | null>(null)
  const [claimingMissionLevel2, setClaimingMissionLevel2] = useState(false)

  const [trackingOrderNumber, setTrackingOrderNumber] = useState('')
  const [trackingToken, setTrackingToken] = useState('')
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null)
  const [trackingMessage, setTrackingMessage] = useState('')
  const [isTracking, setIsTracking] = useState(false)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [loginMessage, setLoginMessage] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [totalOrders, setTotalOrders] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [verificationAmounts, setVerificationAmounts] = useState<Record<string, string>>({})
  const [verificationReferences, setVerificationReferences] = useState<Record<string, string>>({})
  const [verificationConfirmed, setVerificationConfirmed] = useState<Record<string, boolean>>({})
  const [verificationMessages, setVerificationMessages] = useState<Record<string, string>>({})
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [statusMessages, setStatusMessages] = useState<Record<string, string>>({})

  const [adminTopups, setAdminTopups] = useState<{ id: string; amount: number; created_at: string; phone: string; full_name: string | null }[]>([])
  const [adminTopupsLoading, setAdminTopupsLoading] = useState(false)
  const [adminTopupsMessage, setAdminTopupsMessage] = useState('')
  const [verifyingTopupId, setVerifyingTopupId] = useState<string | null>(null)

  // ADMIN WITHDRAW STATE
  const [adminWithdraws, setAdminWithdraws] = useState<WithdrawRequest[]>([])
  const [adminWithdrawsLoading, setAdminWithdrawsLoading] = useState(false)
  const [adminWithdrawsMessage, setAdminWithdrawsMessage] = useState('')
  const [processingWithdrawId, setProcessingWithdrawId] = useState<string | null>(null)

  const [adminUsers, setAdminUsers] = useState<{ id: string; phone: string; full_name: string | null; balance: number; points: number; is_active: boolean; created_at: string }[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPasswordForUser, setNewPasswordForUser] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPasswordMessage, setResetPasswordMessage] = useState('')

  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([])
    // State untuk Accordion Riwayat Pesanan Admin
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [adminProductsLoading, setAdminProductsLoading] = useState(false)
  const [adminProductsError, setAdminProductsError] = useState('')
    // State untuk Accordion dan Pencarian di Admin
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [adminProductsMessage, setAdminProductsMessage] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productForm, setProductForm] = useState({ name: '', code: '', description: '' })
  const [savingProduct, setSavingProduct] = useState(false)
  const [productFormError, setProductFormError] = useState('')
  const [variantFormProductId, setVariantFormProductId] = useState<string | null>(null)
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [variantForm, setVariantForm] = useState({ variant_name: '', code: '', description: '', cost_price: '', selling_price: '' })
  const [savingVariant, setSavingVariant] = useState(false)
  const [variantFormError, setVariantFormError] = useState('')

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null
  const activeVariants = selectedProduct ? selectedProduct.variants.filter((v) => v.selling_price > 0) : []
  const selectedVariant = activeVariants.find((v) => v.id === selectedVariantId) || null
  const productHasVariants = activeVariants.length > 0
  const isBankTransferProduct = String(selectedProduct?.code || '').toUpperCase() === 'BANKTRANSFER'
  const customTransferAmount = Number(transferAmount)
  const isLoggedIn = Boolean(userToken && userProfile)
  const canOrder = isLoggedIn && Boolean(selectedProduct) && (
    isBankTransferProduct
      ? Boolean(transferBank && transferAccountNumber.trim() && transferAccountName.trim()) && Number.isSafeInteger(customTransferAmount) && customTransferAmount >= 10000 && customTransferAmount <= 1000000 && customTransferAmount % 1000 === 0
      : productHasVariants && Boolean(selectedVariant)
  )
  const selectedAmount = isBankTransferProduct ? customTransferAmount : (selectedVariant ? Number(selectedVariant.selling_price) : 0)
  const serviceFee = 0
  const total = selectedAmount + serviceFee

  useEffect(() => {
    async function loadProducts() {
      setProductsLoading(true); setProductsError('')
      try {
        const response = await fetch(`${API_URL}/api/products`)
        const data = await response.json()
        if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengambil produk.')
        const list: ApiProduct[] = Array.isArray(data.products) ? data.products.map((item: ApiProduct) => ({
          id: item.id, name: item.name, code: item.code, description: item.description ?? null,
          variants: Array.isArray(item.variants) ? item.variants : [],
        })) : []
        setProducts(list)
      
      } catch (error) { setProductsError(error instanceof Error ? error.message : 'Tidak dapat mengambil daftar layanan dari server.')
      } finally { setProductsLoading(false) }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    if (!userToken) return
    async function verifyToken() {
      try {
        const response = await fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${userToken}` } })
        const data = await response.json()
        if (!response.ok || !data.success) { localStorage.removeItem(USER_TOKEN_KEY); setUserToken(null); setUserProfile(null); return }
        setUserProfile(data.user)
      } catch { localStorage.removeItem(USER_TOKEN_KEY); setUserToken(null); setUserProfile(null) }
    }
    verifyToken()
  }, [userToken])

  async function loadUserBalance() {
    if (!userToken) return
    try {
      const response = await fetch(`${API_URL}/api/users/balance`, { headers: { Authorization: `Bearer ${userToken}` } })
      const data = await response.json()
      if (response.ok && data.success) { setUserBalance(Number(data.balance) || 0); setUserPoints(Number(data.points) || 0) }
    } catch { /* abaikan */ }
  }
    async function loadRewards() {
    setRewardsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/rewards`)
      const data = await response.json()
      if (response.ok && data.success) {
        setRewards(data.rewards)
      }
    } catch (error) {
      console.error('Gagal mengambil hadiah:', error)
    } finally {
      setRewardsLoading(false)
    }
  }

  async function loadMission() {
    if (!userToken) return
    try {
      const response = await fetch(`${API_URL}/api/users/mission`, { headers: { Authorization: `Bearer ${userToken}` } })
      const data = await response.json()
      if (response.ok && data.success) setMissionData(data)
    } catch { /* abaikan */ }
  }

  async function loadMissionLevel2() {
    if (!userToken) return
    try {
      const response = await fetch(`${API_URL}/api/users/mission-level2`, { headers: { Authorization: `Bearer ${userToken}` } })
      const data = await response.json()
      if (response.ok && data.success) setMissionLevel2Data(data)
    } catch { /* abaikan */ }
  }

  async function handleRedeemPoints() {
    if (!userToken) return
    if (userPoints < 100) return
    if (!window.confirm(`Tukar ${userPoints - (userPoints % 100)} poin menjadi saldo?`)) return
    try {
      const pointsToRedeem = userPoints - (userPoints % 100)
      const response = await fetch(`${API_URL}/api/users/redeem-points`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ points: pointsToRedeem }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal tukar poin.')
      alert(data.message); await loadUserBalance()
    } catch (error) { alert(error instanceof Error ? error.message : 'Terjadi kesalahan.') }
  }

  async function handleClaimMission() {
    if (!userToken || !missionData?.can_claim) return
    if (!window.confirm('Klaim bonus saldo Rp 20.000 sekarang?')) return
    setClaimingMission(true)
    try {
      const response = await fetch(`${API_URL}/api/users/claim-mission`, { method: 'POST', headers: { Authorization: `Bearer ${userToken}` } })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal klaim bonus.')
      alert(data.message)
      await loadMission()
      await loadUserBalance()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan.')
    } finally {
      setClaimingMission(false)
    }
  }

  async function handleClaimMissionLevel2() {
    if (!userToken || !missionLevel2Data?.can_claim) return
    if (!window.confirm('Klaim bonus saldo Rp 50.000 untuk misi 50 transaksi sekarang?')) return
    setClaimingMissionLevel2(true)
    try {
      const response = await fetch(`${API_URL}/api/users/claim-mission-level2`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userToken}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal klaim bonus misi level 2.')
      alert(data.message)
      await loadMissionLevel2()
      await loadUserBalance()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan.')
    } finally {
      setClaimingMissionLevel2(false)
    }
  }

  // ============ WITHDRAW USER ============
  async function handleWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userToken) return
    setSubmittingWithdraw(true); setWithdrawError('')
    try {
      const amount = Number(withdrawForm.amount)
      const response = await fetch(`${API_URL}/api/users/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({
          amount,
          bank_name: withdrawForm.bank_name.trim(),
          account_number: withdrawForm.account_number.trim(),
          account_name: withdrawForm.account_name.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal ajukan withdraw.')
      alert(data.message)
      setIsWithdrawOpen(false)
      setWithdrawForm({ amount: '', bank_name: '', account_number: '', account_name: '' })
      await loadUserBalance()
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : 'Terjadi kesalahan.')
    } finally {
      setSubmittingWithdraw(false)
    }
  }

  async function handleTopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userToken) return
    setIsUserSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/users/topup`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ amount: topupAmount }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal top up.')
      setTopupQrisData({ id: data.topup.id, amount: topupAmount })
    } catch (error) { alert(error instanceof Error ? error.message : 'Terjadi kesalahan.') } finally { setIsUserSubmitting(false) }
  }

  async function loadUserOrders() {
    if (!userToken) { setUserOrders([]); return }
    setUserOrdersLoading(true); setUserOrdersError('')
    try {
      const response = await fetch(`${API_URL}/api/users/orders?page=1&limit=50`, { headers: { Authorization: `Bearer ${userToken}` } })
      const data = await response.json()
      if (response.status === 401) { localStorage.removeItem(USER_TOKEN_KEY); setUserToken(null); setUserProfile(null); setUserOrdersError('Sesi login kedaluwarsa. Silakan login kembali.'); return }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengambil riwayat pesanan.')
      setUserOrders(Array.isArray(data.orders) ? data.orders : [])
    } catch (error) { setUserOrdersError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setUserOrdersLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'orders' && isLoggedIn) loadUserOrders()
    if (activeTab === 'account' && isLoggedIn) { loadUserBalance(); loadMission(); loadMissionLevel2() }
        if (activeTab === 'home' && isLoggedIn) { loadRewards() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isLoggedIn])

  async function handleUserRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setUserFormError(''); setIsUserSubmitting(true)
    try {
            const response = await fetch(`${API_URL}/api/users/register`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          phone: userForm.phone.trim(), 
          password: userForm.password, 
          full_name: userForm.full_name.trim(),
          referred_by: referralCode 
        }) 
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Pendaftaran gagal.')
      localStorage.setItem(USER_TOKEN_KEY, data.token); setUserToken(data.token); setUserProfile(data.user); setUserForm({ phone: '', password: '', full_name: '' }); setUserPage('main'); setActiveTab('home')
    } catch (error) { setUserFormError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.') } finally { setIsUserSubmitting(false) }
  }

  async function handleUserLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setUserFormError(''); setIsUserSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: userForm.phone.trim(), password: userForm.password }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Login gagal.')
      localStorage.setItem(USER_TOKEN_KEY, data.token); setUserToken(data.token); setUserProfile(data.user); setUserForm({ phone: '', password: '', full_name: '' }); setUserPage('main'); setActiveTab('home')
    } catch (error) { setUserFormError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.') } finally { setIsUserSubmitting(false) }
  }

  function handleUserLogout() {
    localStorage.removeItem(USER_TOKEN_KEY)
    setUserToken(null); setUserProfile(null); setUserOrders([]); setUserOrdersError(''); setUserBalance(0); setUserPoints(0); setCreatedOrder(null); setUserPage('main'); setActiveTab('account')
  }

  useEffect(() => {
    const savedToken = sessionStorage.getItem('digitalku_admin_token')
    if (!savedToken) return
    async function verifySavedSession() {
      try {
        const response = await fetch(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
        const data = await response.json()
        if (!response.ok || !data.success) { sessionStorage.removeItem('digitalku_admin_token'); return }
        setAdminName(data.admin?.username || 'Admin'); setPage('dashboard')
      } catch { sessionStorage.removeItem('digitalku_admin_token') }
    }
    verifySavedSession()
  }, [])

  async function loadAdminOrders(pageNumber = currentPage) {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setOrdersError('Sesi admin tidak ditemukan. Silakan login kembali.'); setOrders([]); return }
    setOrdersLoading(true); setOrdersError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/orders?page=${pageNumber}&limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); setOrders([]); setOrdersError('Sesi admin kedaluwarsa. Silakan keluar dan login kembali.'); return }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengambil daftar pesanan.')
      setOrders(data.orders || [])
      setTotalOrders(Number(data.pagination?.total_orders || data.pagination?.total || 0))
      setTotalPages(Math.max(1, Number(data.pagination?.total_pages || data.pagination?.totalPages || 1)))
      setCurrentPage(pageNumber)
    } catch (error) { setOrdersError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setOrdersLoading(false) }
  }

  async function loadAdminProducts() {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setAdminProductsError('Sesi admin tidak ditemukan. Silakan login kembali.'); return }
    setAdminProductsLoading(true); setAdminProductsError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/products`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); setAdminProductsError('Sesi admin kedaluwarsa. Silakan login kembali.'); return }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengambil produk admin.')
      const list: AdminProduct[] = Array.isArray(data.products) ? data.products.map((p: AdminProduct) => ({
        id: p.id, name: p.name, code: p.code, description: p.description ?? null, is_active: Boolean(p.is_active),
        created_at: p.created_at, updated_at: p.updated_at, variants: Array.isArray(p.variants) ? p.variants : [],
      })) : []
      setAdminProducts(list)
    } catch (error) { setAdminProductsError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setAdminProductsLoading(false) }
  }

  async function loadAdminTopups() {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    setAdminTopupsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/topups`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok && data.success) setAdminTopups(data.topups || [])
    } catch { /* abaikan */ } finally { setAdminTopupsLoading(false) }
  }

  async function loadAdminWithdraws() {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    setAdminWithdrawsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/withdraws`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (response.ok && data.success) setAdminWithdraws(data.withdraws || [])
    } catch { /* abaikan */ } finally { setAdminWithdrawsLoading(false) }
  }

  async function handleProcessWithdraw(id: string, action: 'approve' | 'reject') {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    const confirmMsg = action === 'approve' 
      ? 'Konfirmasi: Anda sudah mentransfer uang ke rekening pelanggan?' 
      : 'Konfirmasi: Tolak permintaan withdraw ini dan kembalikan saldo pelanggan?'
    if (!window.confirm(confirmMsg)) return
    
    setProcessingWithdrawId(id); setAdminWithdrawsMessage('')
    try {
      const response = await fetch(`${API_URL}/api/admin/withdraws/${encodeURIComponent(id)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, admin_notes: action === 'approve' ? 'Sudah ditransfer oleh admin.' : 'Ditolak oleh admin.' }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memproses withdraw.')
      setAdminWithdrawsMessage(data.message)
      await loadAdminWithdraws()
    } catch (error) { setAdminWithdrawsMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.') } finally { setProcessingWithdrawId(null) }
  }

  async function loadAdminUsers() {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    setAdminUsersLoading(true); setAdminUsersError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengambil daftar pelanggan.')
      setAdminUsers(data.users || [])
    } catch (error) { setAdminUsersError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setAdminUsersLoading(false) }
  }

  async function handleResetPasswordUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resetPasswordUserId) return
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    setResettingPassword(true); setResetPasswordMessage('')
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(resetPasswordUserId)}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPasswordForUser }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mereset password.')
      setResetPasswordMessage('Password berhasil direset.')
      setTimeout(() => { setResetPasswordUserId(null); setNewPasswordForUser(''); setResetPasswordMessage(''); }, 1500)
    } catch (error) { setResetPasswordMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.')
    } finally { setResettingPassword(false) }
  }

  useEffect(() => {
    if (page === 'dashboard') { loadAdminOrders(1); loadAdminProducts(); loadAdminTopups(); loadAdminUsers(); loadAdminWithdraws() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (page === 'dashboard' && adminTab === 'users') { loadAdminUsers() }
    if (page === 'dashboard' && adminTab === 'withdraws') { loadAdminWithdraws() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminTab, page])

  async function refreshCustomerProducts() {
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()
      if (response.ok && data.success && Array.isArray(data.products)) {
        setProducts(data.products.map((item: ApiProduct) => ({
          id: item.id, name: item.name, code: item.code, description: item.description ?? null,
          variants: Array.isArray(item.variants) ? item.variants : [],
        })))
      }
    } catch { /* abaikan */ }
  }

  function resetProductForm() { setProductForm({ name: '', code: '', description: '' }); setEditingProductId(null); setProductFormError(''); setShowProductForm(false) }
  function openCreateProduct() { setProductForm({ name: '', code: '', description: '' }); setEditingProductId(null); setProductFormError(''); setShowProductForm(true) }
  function openEditProduct(product: AdminProduct) { setProductForm({ name: product.name, code: product.code, description: product.description || '' }); setEditingProductId(product.id); setProductFormError(''); setShowProductForm(true) }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setProductFormError('Sesi admin tidak ditemukan. Silakan login kembali.'); return }
    setSavingProduct(true); setProductFormError(''); setAdminProductsMessage('')
    try {
      const isEdit = Boolean(editingProductId)
      const url = isEdit ? `${API_URL}/api/admin/products/${encodeURIComponent(editingProductId as string)}` : `${API_URL}/api/admin/products`
      const body: Record<string, unknown> = { name: productForm.name.trim(), code: productForm.code.trim().toUpperCase(), description: productForm.description.trim() }
      if (isEdit) { const current = adminProducts.find((p) => p.id === editingProductId); body.is_active = current ? current.is_active : true }
      const response = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa. Silakan login kembali.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan produk.')
      setAdminProductsMessage(isEdit ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.')
      resetProductForm(); await loadAdminProducts(); await refreshCustomerProducts()
    } catch (error) { setProductFormError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setSavingProduct(false) }
  }

  async function handleToggleProduct(product: AdminProduct) {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setAdminProductsError('Sesi admin tidak ditemukan. Silakan login kembali.'); return }
    const nextActive = !product.is_active
    if (!window.confirm(nextActive ? `Aktifkan produk ${product.name}?` : `Nonaktifkan produk ${product.name}?`)) return
    setAdminProductsMessage(''); setAdminProductsError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: product.name, code: product.code, description: product.description || '', is_active: nextActive }) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa. Silakan login kembali.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengubah status produk.')
      setAdminProductsMessage(nextActive ? `Produk ${product.name} diaktifkan.` : `Produk ${product.name} dinonaktifkan.`)
      await loadAdminProducts(); await refreshCustomerProducts()
    } catch (error) { setAdminProductsError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.') }
  }

  function resetVariantForm() { setVariantForm({ variant_name: '', code: '', description: '', cost_price: '', selling_price: '' }); setEditingVariantId(null); setVariantFormProductId(null); setVariantFormError('') }
  function openCreateVariant(productId: string) { setVariantForm({ variant_name: '', code: '', description: '', cost_price: '', selling_price: '' }); setEditingVariantId(null); setVariantFormProductId(productId); setVariantFormError('') }
  function openEditVariant(productId: string, variant: AdminVariant) { setVariantForm({ variant_name: variant.variant_name, code: variant.code, description: variant.description || '', cost_price: String(variant.cost_price), selling_price: String(variant.selling_price) }); setEditingVariantId(variant.id); setVariantFormProductId(productId); setVariantFormError('') }

  async function handleSaveVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setVariantFormError('Sesi admin tidak ditemukan. Silakan login kembali.'); return }
    if (!variantFormProductId) { setVariantFormError('Produk tidak diketahui.'); return }
    setSavingVariant(true); setVariantFormError(''); setAdminProductsMessage('')
    try {
      const isEdit = Boolean(editingVariantId)
      const url = isEdit ? `${API_URL}/api/admin/variants/${encodeURIComponent(editingVariantId as string)}` : `${API_URL}/api/admin/variants`
      const body: Record<string, unknown> = { variant_name: variantForm.variant_name.trim(), code: variantForm.code.trim().toUpperCase(), description: variantForm.description.trim(), cost_price: Number(variantForm.cost_price || 0), selling_price: Number(variantForm.selling_price || 0) }
      if (!isEdit) body.product_id = variantFormProductId
      if (isEdit) { const current = adminProducts.find((p) => p.id === variantFormProductId)?.variants.find((v) => v.id === editingVariantId); body.is_active = current ? current.is_active : true }
      const response = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa. Silakan login kembali.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan varian.')
      setAdminProductsMessage(isEdit ? 'Varian berhasil diperbarui.' : 'Varian berhasil ditambahkan.')
      resetVariantForm(); await loadAdminProducts(); await refreshCustomerProducts()
    } catch (error) { setVariantFormError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setSavingVariant(false) }
  }

  async function handleToggleVariant(productId: string, variant: AdminVariant) {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setAdminProductsError('Sesi admin tidak ditemukan. Silakan login kembali.'); return }
    const nextActive = !variant.is_active
    if (!window.confirm(nextActive ? `Aktifkan varian ${variant.variant_name}?` : `Nonaktifkan varian ${variant.variant_name}?`)) return
    setAdminProductsMessage(''); setAdminProductsError('')
    try {
      const response = await fetch(`${API_URL}/api/admin/variants/${encodeURIComponent(variant.id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ variant_name: variant.variant_name, code: variant.code, description: variant.description || '', cost_price: Number(variant.cost_price), selling_price: Number(variant.selling_price), is_active: nextActive }) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa. Silakan login kembali.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengubah status varian.')
      setAdminProductsMessage(nextActive ? `Varian ${variant.variant_name} diaktifkan.` : `Varian ${variant.variant_name} dinonaktifkan.`)
      void productId; await loadAdminProducts(); await refreshCustomerProducts()
    } catch (error) { setAdminProductsError(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.') }
  }

  async function handleVerifyTopup(id: string) {
    const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) return
    if (!window.confirm('Verifikasi Top Up ini? Pastikan uang sudah masuk ke rekening Anda.')) return
    setVerifyingTopupId(id); setAdminTopupsMessage('')
    try {
      const response = await fetch(`${API_URL}/api/admin/topups/${encodeURIComponent(id)}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal verifikasi Top Up.')
      setAdminTopupsMessage('Top Up berhasil diverifikasi. Saldo user telah ditambahkan.')
      await loadAdminTopups()
      await loadAdminUsers()
    } catch (error) { setAdminTopupsMessage(error instanceof Error ? error.message : 'Terjadi kesalahan.') } finally { setVerifyingTopupId(null) }
  }

  async function handleVerifyPayment(order: AdminOrder) {
    const orderId = order.id; const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setVerificationMessages((prev) => ({ ...prev, [orderId]: 'Sesi admin tidak ditemukan.' })); return }
    const receivedAmount = Number(verificationAmounts[orderId] ?? order.expected_amount ?? order.total_amount)
    const transactionReference = (verificationReferences[orderId] || '').trim()
    if (!Number.isSafeInteger(receivedAmount) || receivedAmount <= 0) { setVerificationMessages((prev) => ({ ...prev, [orderId]: 'Masukkan nominal pembayaran yang valid.' })); return }
    if (!transactionReference) { setVerificationMessages((prev) => ({ ...prev, [orderId]: 'Masukkan referensi transaksi.' })); return }
    if (!verificationConfirmed[orderId]) { setVerificationMessages((prev) => ({ ...prev, [orderId]: 'Centang konfirmasi.' })); return }
    setVerifyingOrderId(orderId); setVerificationMessages((prev) => ({ ...prev, [orderId]: '' }))
    try {
      const response = await fetch(`${API_URL}/api/admin/payments/${encodeURIComponent(orderId)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ received_amount: receivedAmount, transaction_reference: transactionReference }) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Verifikasi pembayaran gagal.')
      setVerificationMessages((prev) => ({ ...prev, [orderId]: 'Pembayaran berhasil diverifikasi.' }))
      setVerificationConfirmed((prev) => ({ ...prev, [orderId]: false })); await loadAdminOrders(currentPage)
    } catch (error) { setVerificationMessages((prev) => ({ ...prev, [orderId]: error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.' }))
    } finally { setVerifyingOrderId(null) }
  }

  async function handleUpdateOrderStatus(order: AdminOrder, nextStatus: 'processing' | 'completed' | 'failed') {
    const orderId = order.id; const token = sessionStorage.getItem('digitalku_admin_token')
    if (!token) { setStatusMessages((prev) => ({ ...prev, [orderId]: 'Sesi admin tidak ditemukan.' })); return }
    const allowedTransitions: Record<string, string[]> = { paid: ['processing'], processing: ['completed', 'failed'] }
    if (!allowedTransitions[order.order_status]?.includes(nextStatus)) { setStatusMessages((prev) => ({ ...prev, [orderId]: 'Perubahan status tidak diizinkan.' })); return }
    if (order.payment_status !== 'verified') { setStatusMessages((prev) => ({ ...prev, [orderId]: 'Pembayaran harus diverifikasi.' })); return }
    const confirmationMessages: Record<string, string> = { processing: 'Mulai proses?', completed: 'Tandai selesai?', failed: 'Tandai gagal?' }
    if (!window.confirm(confirmationMessages[nextStatus])) return
    setUpdatingStatusId(orderId); setStatusMessages((prev) => ({ ...prev, [orderId]: '' }))
    try {
      const response = await fetch(`${API_URL}/api/admin/orders/${encodeURIComponent(orderId)}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: nextStatus }) })
      const data = await response.json()
      if (response.status === 401) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Sesi admin kedaluwarsa.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Gagal mengubah status.')
      setStatusMessages((prev) => ({ ...prev, [orderId]: `Status berhasil diperbarui.` })); await loadAdminOrders(currentPage)
    } catch (error) { setStatusMessages((prev) => ({ ...prev, [orderId]: error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.' }))
    } finally { setUpdatingStatusId(null) }
  }

  async function handleOrder() {
    setMessage(''); setCreatedOrder(null)
    if (!isLoggedIn || !userToken) { setUserFormError(''); setUserAuthMode('login'); setUserPage('login'); return }
    if (productsLoading) { setMessage('Sedang mengambil daftar layanan.'); return }
    if (!selectedProduct) { setMessage('Pilih layanan.'); return }
    if (!isBankTransferProduct && !productHasVariants) { setMessage('Produk belum tersedia.'); return }
    if (!isBankTransferProduct && !selectedVariant) { setMessage('Pilih varian.'); return }
    if (isBankTransferProduct) {
      if (!transferBank || !transferAccountNumber.trim() || !transferAccountName.trim()) { setMessage('Lengkapi bank, nomor rekening, dan nama pemilik rekening.'); return }
      if (!Number.isSafeInteger(customTransferAmount) || customTransferAmount < 10000 || customTransferAmount > 1000000 || customTransferAmount % 1000 !== 0) { setMessage('Nominal transfer minimal Rp10.000, maksimal Rp1.000.000, dan kelipatan Rp1.000.'); return }
    } else if (!phone.trim()) { setMessage(getCategoryForProduct(selectedProduct) === 'Game' ? 'Masukkan User ID Game.' : 'Masukkan nomor tujuan.'); return }
    const destination = isBankTransferProduct
      ? `BANK: ${transferBank} | REKENING: ${transferAccountNumber.trim()} | NAMA: ${transferAccountName.trim()}`
      : phone.trim()
    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, body: JSON.stringify({ product_id: selectedProduct.id, variant_id: isBankTransferProduct ? undefined : selectedVariant.id, amount: isBankTransferProduct ? customTransferAmount : undefined, destination_number: destination, payment_method: paymentMethod }) })
      const data = await response.json()
      if (response.status === 401) { localStorage.removeItem(USER_TOKEN_KEY); setUserToken(null); setUserProfile(null); throw new Error('Sesi login kedaluwarsa.') }
      if (!response.ok || !data.success) throw new Error(data.message || 'Pesanan gagal dibuat.')
      const newOrder = data.order as CreatedOrder
      setCreatedOrder(newOrder); setMessage(data.message || 'Pesanan berhasil dibuat.'); setPhone('')
      await loadUserOrders(); await loadUserBalance()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setIsSubmitting(false) }
  }

  async function handleTrackOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTrackingMessage(''); setTrackedOrder(null)
    const orderNumber = trackingOrderNumber.trim(); const token = trackingToken.trim()
    if (!orderNumber || !token) { setTrackingMessage('Masukkan nomor pesanan dan kode pelacakan.'); return }
    setIsTracking(true)
    try {
      const response = await fetch(`${API_URL}/api/orders/${encodeURIComponent(orderNumber)}/track/${encodeURIComponent(token)}`)
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Pesanan tidak ditemukan.')
      setTrackedOrder(data.order); setTrackingMessage(data.message || 'Pesanan ditemukan.')
    } catch (error) { setTrackingMessage(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setIsTracking(false) }
  }

  function openTracking(order: { order_number: string; tracking_token: string }) {
    setTrackingOrderNumber(order.order_number); setTrackingToken(order.tracking_token); setTrackedOrder(null); setTrackingMessage(''); setActiveTab('track')
  }

  async function handleAdminLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoginMessage(''); setIsLoggingIn(true)
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Login gagal.')
      const token = data.token
      if (!token) throw new Error('Token login tidak ditemukan.')
      sessionStorage.setItem('digitalku_admin_token', token)
      const verifyResponse = await fetch(`${API_URL}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok || !verifyData.success) { sessionStorage.removeItem('digitalku_admin_token'); throw new Error('Verifikasi token gagal.') }
      setAdminName(verifyData.admin?.username || username.trim()); setPassword(''); setLoginMessage(''); setOrders([]); setAdminProducts([]); setCurrentPage(1); setPage('dashboard')
    } catch (error) { setLoginMessage(error instanceof Error ? error.message : 'Tidak dapat terhubung ke server.')
    } finally { setIsLoggingIn(false) }
  }

  function handleAdminLogout() {
    sessionStorage.removeItem('digitalku_admin_token')
    setAdminName(''); setUsername(''); setPassword(''); setLoginMessage(''); setOrders([]); setOrdersError('')
    setVerificationMessages({}); setVerificationAmounts({}); setVerificationReferences({}); setVerificationConfirmed({}); setStatusMessages({}); setUpdatingStatusId(null)
    setAdminProducts([]); setAdminProductsError(''); setAdminProductsMessage(''); resetProductForm(); resetVariantForm()
    setAdminUsers([]); setAdminUsersError(''); setResetPasswordUserId(null); setNewPasswordForUser(''); setResetPasswordMessage('')
    setPage('store'); setActiveTab('account')
  }

  if (page === 'login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
          <button type="button" onClick={() => { setPage('store'); setActiveTab('account') }} className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={18} />Kembali ke toko</button>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white"><LockKeyhole size={27} /></div>
          <h1 className="text-2xl font-extrabold text-slate-800">Login Admin</h1>
          <p className="mt-2 text-sm text-slate-500">Masuk untuk mengelola layanan LukingzzStore.</p>
          <form onSubmit={handleAdminLogin} className="mt-7 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username admin" autoComplete="username" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password admin" autoComplete="current-password" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            {loginMessage && (<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loginMessage}</div>)}
            <button type="submit" disabled={isLoggingIn} className="w-full rounded-xl bg-blue-700 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isLoggingIn ? 'Memeriksa...' : 'Masuk Admin'}</button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-400">LukingzzStore · Area administrator</p>
        </div>
      </div>
    )
  }

  if (page === 'dashboard') {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <header className="relative px-5 pb-8 pt-6 text-white bg-blue-700 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/header-admin.png')" }}>
          <div className="absolute inset-0 bg-blue-900/50 mix-blend-multiply"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 backdrop-blur-sm p-3"><LayoutDashboard size={24} /></div>
                <div><h1 className="text-xl font-extrabold">LukingzzStore</h1><p className="text-xs text-blue-100">Dashboard Admin</p></div>
              </div>
              <button type="button" onClick={handleAdminLogout} className="flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-sm px-3 py-2 text-sm font-semibold hover:bg-white/30"><LogOut size={17} />Keluar</button>
            </div>
            <div className="mt-7">
              <p className="text-sm text-blue-100">Selamat datang,</p>
              <h2 className="mt-1 text-2xl font-bold">{adminName}</h2>
              <p className="mt-2 text-sm text-blue-100">Anda masuk ke area administrator.</p>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-slate-200 px-5 py-2 sticky top-0 z-10 shadow-sm">
          <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto">
            <button type="button" onClick={() => setAdminTab('orders')} className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${adminTab === 'orders' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>Pesanan</button>
            <button type="button" onClick={() => setAdminTab('products')} className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${adminTab === 'products' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>Produk</button>
            <button type="button" onClick={() => setAdminTab('users')} className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${adminTab === 'users' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-50'}`}>Pelanggan</button>
            <button type="button" onClick={() => setAdminTab('withdraws')} className={`rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition ${adminTab === 'withdraws' ? 'bg-rose-100 text-rose-700' : 'text-slate-500 hover:bg-slate-50'}`}>Withdraw</button>
          </div>
        </div>

        <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">
          {adminTab === 'orders' && (
            <>
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500"><ReceiptText size={19} /><span className="text-xs font-medium">Total pesanan</span></div>
                  <p className="mt-2 text-2xl font-extrabold text-slate-800">{totalOrders}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-600"><Clock size={19} /><span className="text-xs font-medium">Menunggu bayar</span></div>
                  <p className="mt-2 text-2xl font-extrabold text-slate-800">{orders.filter((o) => o.payment_status === 'pending').length}</p>
                </div>
              </section>

              {adminTopups.length > 0 && (
                <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Coins size={23} /></div>
                      <div><h3 className="font-bold">Permintaan Top Up Saldo</h3><p className="text-xs text-slate-500">Menunggu verifikasi</p></div>
                    </div>
                    <button type="button" onClick={loadAdminTopups} disabled={adminTopupsLoading} className="text-xs text-emerald-700 hover:underline">Muat Ulang</button>
                  </div>
                  {adminTopupsMessage && (<div className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{adminTopupsMessage}</div>)}
                  <div className="space-y-3">
                    {adminTopups.map((topup) => (
                      <div key={topup.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{formatRupiah(Number(topup.amount) || 0)}</p>
                          <p className="text-xs text-slate-500">{topup.full_name || 'Pelanggan'} ({topup.phone})</p>
                          <p className="text-[10px] text-slate-400">{formatDate(topup.created_at)}</p>
                        </div>
                        <button type="button" onClick={() => handleVerifyTopup(topup.id)} disabled={verifyingTopupId === topup.id} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          {verifyingTopupId === topup.id ? 'Memverifikasi...' : 'Verifikasi'}
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><ReceiptText size={23} /></div>
                    <div><h3 className="font-bold">Manajemen pesanan</h3><p className="text-xs text-slate-500">Data dari database Neon</p></div>
                  </div>
                  <button type="button" onClick={() => loadAdminOrders(currentPage)} disabled={ordersLoading} className="flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={15} className={ordersLoading ? 'animate-spin' : ''} />Muat Ulang</button>
                </div>
                {ordersError && (<div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{ordersError}</p></div>)}
                {ordersLoading && (<div className="py-8 text-center text-sm text-slate-500"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-blue-600" />Mengambil data...</div>)}
                {!ordersLoading && !ordersError && orders.length === 0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center">
                    <ReceiptText size={30} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Belum ada pesanan</p>
                  </div>
                )}
                             {!ordersLoading && orders.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      return (
                        <article key={order.id || order.order_number} className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-all">
                          
                          {/* BAGIAN HEADER (Selalu Terlihat) */}
                          <div 
                            className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between gap-3"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800 break-all">{order.order_number}</p>
                              <p className="text-[11px] text-slate-500 mt-1">{order.customer_name || order.customer_phone}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(order.payment_status)}`}>
                                {statusLabel(order.payment_status)}
                              </span>
                              <span className="text-xs font-extrabold text-blue-700">
                                {formatRupiah(Number(order.total_amount || 0))}
                              </span>
                            </div>
                          </div>

                          {/* BAGIAN DETAIL (Hanya muncul jika diklik) */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                <div><p className="text-[10px] text-slate-400">Layanan</p><p className="font-semibold">{order.product_name || order.product_code || '-'}</p></div>
                                <div><p className="text-[10px] text-slate-400">Nomor Tujuan</p><p className="font-semibold break-all">{order.destination_number}</p></div>
                                <div><p className="text-[10px] text-slate-400">Nomor Pelanggan</p><p className="font-semibold">{order.customer_phone}</p></div>
                                <div><p className="text-[10px] text-slate-400">Nama Pelanggan</p><p className="font-semibold">{order.customer_name || '-'}</p></div>
                              </div>

                              <div className="space-y-1.5 rounded-lg bg-white p-3 text-xs border border-slate-100 mb-4">
                                <div className="flex justify-between"><span className="text-slate-500">Nominal saldo</span><span className="font-semibold">{formatRupiah(Number(order.amount || 0))}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Biaya layanan</span><span className="font-semibold">{formatRupiah(Number(order.service_fee || 0))}</span></div>
                                <div className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span className="font-bold">Total</span><span className="font-extrabold text-blue-700">{formatRupiah(Number(order.total_amount || 0))}</span></div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div><p className="text-[10px] text-slate-400 mb-1">Status pesanan</p><span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColor(order.order_status)}`}>{statusLabel(order.order_status)}</span></div>
                                <div><p className="text-[10px] text-slate-400 mb-1">Status pembayaran</p><span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${statusColor(order.payment_status)}`}>{statusLabel(order.payment_status)}</span></div>
                              </div>

                              <div className="border-t border-slate-200 pt-3 text-xs text-slate-500 mb-4">
                                <div className="flex justify-between gap-2"><span>Metode pembayaran</span><span className="font-semibold">{order.payment_method || 'QRIS'}</span></div>
                                {order.transaction_reference && (<div className="mt-1 flex justify-between gap-2"><span>Referensi</span><span className="font-semibold">{order.transaction_reference}</span></div>)}
                                {order.verified_at && (<div className="mt-1 flex justify-between gap-2"><span>Diverifikasi</span><span className="font-semibold">{formatDate(order.verified_at)}</span></div>)}
                              </div>

                              {/* LOGIKA TOMBOL VERIFIKASI & STATUS */}
                              {order.payment_status === 'pending' && order.order_status === 'pending' && (
                                <div className="mt-2 border-t border-slate-200 pt-3">
                                  <div className="flex items-center gap-2 mb-2"><Wallet size={16} className="text-blue-700" /><h4 className="font-bold text-slate-800 text-sm">Verifikasi pembayaran</h4></div>
                                  <div className="space-y-2">
                                    <input type="number" value={verificationAmounts[order.id] ?? String(order.expected_amount || order.total_amount)} onChange={(e) => { setVerificationAmounts((prev) => ({ ...prev, [order.id]: e.target.value })) }} placeholder="Nominal diterima" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                                    <input type="text" value={verificationReferences[order.id] || ''} onChange={(e) => { setVerificationReferences((prev) => ({ ...prev, [order.id]: e.target.value })) }} placeholder="ID Referensi" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" />
                                    <label className="flex items-center gap-2 cursor-pointer p-1">
                                      <input type="checkbox" checked={Boolean(verificationConfirmed[order.id])} onChange={(e) => { setVerificationConfirmed((prev) => ({ ...prev, [order.id]: e.target.checked })) }} className="h-3.5 w-3.5 accent-blue-700" />
                                      <span className="text-[10px] text-slate-700">Pembayaran sudah dicek.</span>
                                    </label>
                                    <button type="button" onClick={() => handleVerifyPayment(order)} disabled={verifyingOrderId === order.id || !verificationConfirmed[order.id]} className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                                      {verifyingOrderId === order.id ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Verifikasi
                                    </button>
                                  </div>
                                </div>
                              )}

                              {order.payment_status === 'verified' && ['paid', 'processing'].includes(order.order_status) && (
                                <div className="mt-2 border-t border-slate-200 pt-3">
                                  <div className="flex items-center gap-2 mb-2"><PackageCheck size={16} className="text-blue-700" /><h4 className="font-bold text-slate-800 text-sm">Proses Pesanan</h4></div>
                                  {order.order_status === 'paid' && (
                                    <button type="button" onClick={() => handleUpdateOrderStatus(order, 'processing')} disabled={updatingStatusId === order.id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                                      {updatingStatusId === order.id ? <RefreshCw size={14} className="animate-spin" /> : <PackageCheck size={14} />} Proses
                                    </button>
                                  )}
                                  {order.order_status === 'processing' && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <button type="button" onClick={() => handleUpdateOrderStatus(order, 'completed')} disabled={updatingStatusId === order.id} className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Selesai</button>
                                      <button type="button" onClick={() => handleUpdateOrderStatus(order, 'failed')} disabled={updatingStatusId === order.id} className="flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">Gagal</button>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>
                          )}
                        </article>
                      )
                    })}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <button type="button" disabled={currentPage <= 1 || ordersLoading} onClick={() => loadAdminOrders(currentPage - 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Sebelumnya</button>
                      <span className="text-xs text-slate-500">Halaman {currentPage} dari {totalPages}</span>
                      <button type="button" disabled={currentPage >= totalPages || ordersLoading} onClick={() => loadAdminOrders(currentPage + 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Berikutnya</button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {adminTab === 'withdraws' && (
            <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-rose-50 p-3 text-rose-700"><ArrowUpFromLine size={23} /></div>
                  <div><h3 className="font-bold">Permintaan Withdraw</h3><p className="text-xs text-slate-500">Pelanggan yang ingin menarik saldo</p></div>
                </div>
                <button type="button" onClick={loadAdminWithdraws} disabled={adminWithdrawsLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={adminWithdrawsLoading ? 'animate-spin' : ''} />Muat Ulang</button>
              </div>

              {adminWithdrawsMessage && (<div className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{adminWithdrawsMessage}</div>)}

              {adminWithdrawsLoading && (<div className="py-8 text-center text-sm text-slate-500"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-rose-600" />Mengambil data...</div>)}

              {!adminWithdrawsLoading && adminWithdraws.length === 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center">
                  <ArrowUpFromLine size={30} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Belum ada permintaan withdraw</p>
                </div>
              )}

              {!adminWithdrawsLoading && adminWithdraws.length > 0 && (
                <div className="space-y-3">
                  {adminWithdraws.map((w) => (
                    <div key={w.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-extrabold text-slate-800">{formatRupiah(Number(w.amount))}</p>
                          <p className="text-xs text-slate-500">Dari: {w.full_name || 'Pelanggan'} ({w.phone})</p>
                          <p className="text-[10px] text-slate-400">{formatDate(w.created_at)}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                        <p className="font-semibold">Tujuan Transfer:</p>
                        <p className="mt-1">Bank: <span className="font-bold">{w.bank_name}</span></p>
                        <p>No. Rekening: <span className="font-mono font-bold">{w.account_number}</span></p>
                        <p>Atas Nama: <span className="font-bold">{w.account_name}</span></p>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => handleProcessWithdraw(w.id, 'approve')} disabled={processingWithdrawId === w.id} className="rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                          {processingWithdrawId === w.id ? 'Memproses...' : '✓ Sudah Transfer'}
                        </button>
                        <button type="button" onClick={() => handleProcessWithdraw(w.id, 'reject')} disabled={processingWithdrawId === w.id} className="rounded-lg bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                          {processingWithdrawId === w.id ? 'Memproses...' : '✗ Tolak'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

                   {adminTab === 'products' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><Package size={23} /></div>
                  <div><h3 className="font-bold">Produk & varian</h3><p className="text-xs text-slate-500">Kelola produk dan harga jual</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={loadAdminProducts} disabled={adminProductsLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={adminProductsLoading ? 'animate-spin' : ''} />Muat Ulang</button>
                  <button type="button" onClick={openCreateProduct} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Plus size={15} />Tambah Produk</button>
                </div>
              </div>

              {/* FITUR PENCARIAN PRODUK */}
              <div className="mt-4">
                <input 
                  type="text" 
                  placeholder="Cari produk (misal: AXIS, Indosat)..." 
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {adminProductsError && (<div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{adminProductsError}</p></div>)}
              {adminProductsMessage && (<div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><p>{adminProductsMessage}</p></div>)}
              
              {showProductForm && (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-900">{editingProductId ? 'Edit produk' : 'Tambah produk baru'}</h4>
                    <button type="button" onClick={resetProductForm} className="rounded-lg p-1 text-indigo-700 hover:bg-indigo-100"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleSaveProduct} className="mt-3 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Nama produk</label>
                      <input type="text" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} placeholder="Contoh: Telkomsel" required maxLength={150} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Kode produk</label>
                      <input type="text" value={productForm.code} onChange={(e) => setProductForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Contoh: TELKOMSEL" required maxLength={100} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi (opsional)</label>
                      <textarea value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    {productFormError && (<div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{productFormError}</div>)}
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingProduct} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{savingProduct ? 'Menyimpan...' : editingProductId ? 'Simpan Perubahan' : 'Tambah Produk'}</button>
                      <button type="button" onClick={resetProductForm} disabled={savingProduct} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                    </div>
                  </form>
                </div>
              )}

              {adminProductsLoading && (<div className="py-8 text-center text-sm text-slate-500"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-indigo-600" />Mengambil produk...</div>)}
              
              {!adminProductsLoading && adminProducts.length === 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center">
                  <Package size={30} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Belum ada produk</p>
                </div>
              )}

              {!adminProductsLoading && adminProducts.length > 0 && (
                <div className="mt-5 space-y-4">
                  {/* FILTER PENCARIAN PRODUK */}
                  {adminProducts
                    .filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) || p.code.toLowerCase().includes(productSearchQuery.toLowerCase()))
                    .map((product) => (
                    <article key={product.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{product.name}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </div>
                          <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{product.code}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEditProduct(product)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={13} />Edit</button>
                          <button type="button" onClick={() => handleToggleProduct(product)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${product.is_active ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>{product.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        </div>
                      </div>
                      {product.description && (<p className="mt-2 text-xs leading-5 text-slate-500">{product.description}</p>)}
                      
                      {/* BAGIAN ACCORDION UNTUK VARIAN HARGA */}
                      <div className="mt-4">
                        <button 
                          onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                          className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors p-3 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center gap-2">
                            <Layers size={16} className="text-indigo-700" />
                            <span className="text-sm font-bold text-slate-800">Daftar Harga ({product.variants.length} Varian)</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-600">
                            {expandedProductId === product.id ? '▲ Tutup' : '▼ Buka'}
                          </span>
                        </button>

                        {/* ISI VARIAN (Hanya tampil jika dibuka) */}
                        {expandedProductId === product.id && (
                          <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
                            <div className="flex justify-end mb-2">
                              <button type="button" onClick={() => openCreateVariant(product.id)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700"><Plus size={13} />Tambah Varian</button>
                            </div>
                            
                            {product.variants.length === 0 && (<p className="text-xs text-slate-500 text-center py-2">Belum ada varian.</p>)}
                            
                            {product.variants.map((variant) => (
                              <div key={variant.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-800">{variant.variant_name}</p>
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${variant.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{variant.is_active ? 'Aktif' : 'Nonaktif'}</span>
                                    </div>
                                    <p className="mt-1 break-all font-mono text-[10px] text-slate-500">{variant.code}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <button type="button" onClick={() => openEditVariant(product.id, variant)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Pencil size={11} />Edit</button>
                                    <button type="button" onClick={() => handleToggleVariant(product.id, variant)} className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${variant.is_active ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>{variant.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                                  </div>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                  <div className="rounded bg-slate-50 p-2"><p className="text-[10px] text-slate-400">Harga modal</p><p className="font-semibold text-slate-700">{formatRupiah(Number(variant.cost_price))}</p></div>
                                  <div className="rounded bg-blue-50 p-2"><p className="text-[10px] text-blue-600">Harga jual</p><p className="font-semibold text-blue-700">{formatRupiah(Number(variant.selling_price))}</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* FORM TAMBAH/EDIT VARIAN */}
                      {variantFormProductId === product.id && (
                        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-indigo-900">{editingVariantId ? 'Edit varian' : `Tambah varian untuk ${product.name}`}</h5>
                            <button type="button" onClick={resetVariantForm} className="rounded-lg p-1 text-indigo-700 hover:bg-indigo-100"><X size={18} /></button>
                          </div>
                          <form onSubmit={handleSaveVariant} className="mt-3 space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Nama varian</label>
                              <input type="text" value={variantForm.variant_name} onChange={(e) => setVariantForm((p) => ({ ...p, variant_name: e.target.value }))} placeholder="Contoh: 10.000" required maxLength={150} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Kode varian</label>
                              <input type="text" value={variantForm.code} onChange={(e) => setVariantForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Contoh: TSEL10K" required maxLength={100} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Harga modal (Rp)</label>
                                <input type="number" min="0" step="1" value={variantForm.cost_price} onChange={(e) => setVariantForm((p) => ({ ...p, cost_price: e.target.value }))} placeholder="9500" required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Harga jual (Rp)</label>
                                <input type="number" min="1" step="1" value={variantForm.selling_price} onChange={(e) => setVariantForm((p) => ({ ...p, selling_price: e.target.value }))} placeholder="10500" required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi (opsional)</label>
                              <textarea value={variantForm.description} onChange={(e) => setVariantForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                            </div>
                            {variantFormError && (<div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{variantFormError}</div>)}
                            <div className="flex gap-2">
                              <button type="submit" disabled={savingVariant} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{savingVariant ? 'Menyimpan...' : editingVariantId ? 'Simpan Perubahan' : 'Tambah Varian'}</button>
                              <button type="button" onClick={resetVariantForm} disabled={savingVariant} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                            </div>
                          </form>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          
          {adminTab === 'users' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Users size={23} /></div>
                  <div><h3 className="font-bold">Daftar Pelanggan</h3><p className="text-xs text-slate-500">Kelola akun pelanggan</p></div>
                </div>
                <button type="button" onClick={() => loadAdminUsers()} disabled={adminUsersLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={adminUsersLoading ? 'animate-spin' : ''} />Muat Ulang</button>
              </div>

              {adminUsersError && (<div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p>{adminUsersError}</p></div>)}
              {adminUsersLoading && (<div className="py-8 text-center text-sm text-slate-500"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-emerald-600" />Mengambil data...</div>)}
              
              {!adminUsersLoading && !adminUsersError && adminUsers.length === 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center">
                  <Users size={30} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Belum ada pelanggan</p>
                </div>
              )}

              {!adminUsersLoading && adminUsers.length > 0 && (
                <div className="space-y-3">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-800">{u.full_name || 'Tanpa Nama'}</p>
                          <p className="text-sm text-slate-600">{u.phone}</p>
                          <div className="mt-2 flex gap-3 text-xs">
                            <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">Saldo: {formatRupiah(Number(u.balance) || 0)}</span>
                            <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">Poin: {Number(u.points) || 0}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Terdaftar</p>
                          <p className="text-xs font-semibold text-slate-600">{formatDate(u.created_at)}</p>
                        </div>
                      </div>

                      {resetPasswordUserId === u.id ? (
                        <form onSubmit={handleResetPasswordUser} className="mt-4 rounded-xl bg-slate-50 p-3">
                          <label className="mb-1 block text-xs font-semibold text-slate-700">Password Baru untuk {u.phone}</label>
                          <div className="flex gap-2">
                            <input type="text" value={newPasswordForUser} onChange={(e) => setNewPasswordForUser(e.target.value)} placeholder="Minimal 8 karakter" required minLength={8} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                            <button type="submit" disabled={resettingPassword} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                              {resettingPassword ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button type="button" onClick={() => { setResetPasswordUserId(null); setNewPasswordForUser(''); setResetPasswordMessage(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
                          </div>
                          {resetPasswordMessage && (<p className={`mt-2 text-xs ${resetPasswordMessage.includes('berhasil') ? 'text-emerald-600' : 'text-red-600'}`}>{resetPasswordMessage}</p>)}
                        </form>
                      ) : (
                        <div className="mt-4 border-t border-slate-100 pt-3">
                          <button type="button" onClick={() => { setResetPasswordUserId(u.id); setNewPasswordForUser(''); setResetPasswordMessage(''); }} className="text-xs font-semibold text-red-600 hover:underline">
                            Reset Password
                          </button>
                                                    <button 
                            type="button" 
                            onClick={async () => {
                              if (!window.confirm(`Berikan Jackpot ke ${u.phone}?`)) return;
                              const token = sessionStorage.getItem('digitalku_admin_token');
                              try {
                                const res = await fetch(`/api/admin/users/${u.id}/force-win`, {
                                  method: 'POST',
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const data = await res.json();
                                if (data.success) alert('Jackpot berhasil diberikan!');
                                else alert(data.message);
                              } catch (err) { alert('Gagal memberikan jackpot.'); }
                            }} 
                            className="block mt-2 text-xs font-semibold text-emerald-600 hover:underline"
                          >
                            🎁 Beri Jackpot
                          </button>
                                                  <button 
                          type="button" 
                          onClick={async () => {
                            if (!window.confirm(`Blokir/Buka blokir akun ${u.phone}?`)) return;
                            const token = sessionStorage.getItem('digitalku_admin_token');
                            try {
                              const res = await fetch(`/api/admin/users/${u.id}/toggle-block`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              const data = await res.json();
                              if (data.success) { 
                                alert(data.message); 
                                loadAdminUsers(); // Muat ulang daftar agar status berubah
                              }
                              else alert(data.message);
                            } catch (err) { alert('Gagal memproses blokir.'); }
                          }} 
                          className="block mt-2 text-xs font-semibold text-red-600 hover:underline"
                        >
                          🚫 Blokir Akun
                        </button>
                          
                                                  <br />
                       
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={22} className="mt-0.5 shrink-0 text-blue-700" />
              <div><h3 className="text-sm font-bold text-blue-800">Pemeriksaan pembayaran manual</h3><p className="mt-1 text-xs leading-5 text-blue-700">LukingzzStore belum terhubung otomatis ke sistem DANA. Verifikasi hanya dilakukan setelah admin memastikan transaksi benar-benar masuk melalui riwayat resmi DANA Bisnis.</p></div>
            </div>
          </section>
          <p className="pb-5 text-center text-xs text-slate-400">LukingzzStore · Dashboard administrator</p>
        </main>
      </div>
    )
  }

  if (userPage === 'login' || userPage === 'register') {
    const isRegister = userAuthMode === 'register'
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
          <button type="button" onClick={() => { setUserPage('main'); setUserFormError('') }} className="mb-7 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={18} />Kembali ke toko</button>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white">
            {isRegister ? <UserPlus size={27} /> : <LockKeyhole size={27} />}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">{isRegister ? 'Daftar Akun' : 'Login Pelanggan'}</h1>
          <p className="mt-2 text-sm text-slate-500">{isRegister ? 'Buat akun untuk mulai memesan di LukingzzStore.' : 'Masuk untuk memesan dan melihat riwayat.'}</p>
          <form onSubmit={isRegister ? handleUserRegister : handleUserLogin} className="mt-7 space-y-4">
            {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Nama lengkap (opsional)</label>
                <input type="text" value={userForm.full_name} onChange={(e) => setUserForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Nama Anda" maxLength={100} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            )}
                        {isRegister && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Kode Referral (Opsional)</label>
                <input 
                  type="text" 
                  value={referralCode} 
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())} 
                  placeholder="Masukkan kode ajak teman" 
                  maxLength={50} 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" 
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Nomor HP</label>
              <input type="tel" value={userForm.phone} onChange={(e) => setUserForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Contoh: 081234567890" autoComplete="tel" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <p className="mt-1 text-[10px] text-slate-400">Gunakan nomor yang aktif.</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input type="password" value={userForm.password} onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))} placeholder={isRegister ? 'Minimal 8 karakter' : 'Masukkan password'} autoComplete={isRegister ? 'new-password' : 'current-password'} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            {userFormError && (<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{userFormError}</div>)}
            <button type="submit" disabled={isUserSubmitting} className="w-full rounded-xl bg-blue-700 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isUserSubmitting ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk'}</button>
          </form>
          <div className="mt-5 text-center text-sm text-slate-600">
            {isRegister ? (
              <>Sudah punya akun?{' '}<button type="button" onClick={() => { setUserAuthMode('login'); setUserFormError('') }} className="font-bold text-blue-700 hover:underline">Masuk</button></>
            ) : (
              <>Belum punya akun?{' '}<button type="button" onClick={() => { setUserAuthMode('register'); setUserFormError('') }} className="font-bold text-blue-700 hover:underline">Daftar</button></>
            )}
          </div>
          <button type="button" onClick={() => { setUserPage('main'); setPage('login'); setActiveTab('account') }} className="mt-5 w-full text-center text-xs text-slate-400 hover:text-blue-700">Login sebagai admin</button>
        </div>
      </div>
    )
  }

const groupedProducts: Record<CategoryName, ApiProduct[]> = {
  'E-Wallet': [],
  Pulsa: [],
  Game: [],
     'Layanan Lainnya': [],
}

  
for (const product of products) {
  const category = getCategoryForProduct(product)

  const targetCategory = Object.prototype.hasOwnProperty.call(
    groupedProducts,
    category
  )
    ? category
    : 'Lainnya'

  groupedProducts[targetCategory].push(product)
}

  if (page === 'slot' || window.location.search === '?page=slot') {
    return (
      <div>
        <Slot />
        <div className="text-center mt-4 pb-10">
         <button
  onClick={() => {
    // Paksa browser pindah ke halaman utama dan refresh
    window.location.href = '/'; 
  }}
  className="bg-gray-800 text-white px-6 py-2 rounded-full text-sm font-semibold"
>
  ⬅️ Kembali ke Toko
</button>
        </div>
      </div>
    );
  }
  
  if (page === 'landing') {
    return (
      <LandingPage
        onStartShopping={() => { setPage('store'); setActiveTab('home') }}
        onCustomerLogin={() => {
          setPage('store')
          setUserAuthMode('login')
          setUserForm({ phone: '', password: '', full_name: '' })
          setUserFormError('')
          setUserPage('login')
        }}
        onAdminLogin={() => {
          setUserPage('main')
          setPage('login')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28 text-slate-800">
            {/* NOTIFIKASI SOSIAL (SOCIAL PROOF) */}
      {socialProof && (
        <div className="fixed bottom-24 left-4 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 flex items-center gap-3 animate-slide-in max-w-[280px]">
          <div className="bg-blue-100 p-2 rounded-full">
            <UserRound className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">{socialProof.name}</p>
            <p className="text-[10px] text-slate-600 leading-tight">{socialProof.action}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{socialProof.time}</p>
          </div>
        </div>
      )}
               {/* TOMBOL MENGAMBANG SLOT */}
     <button
  onClick={() => {
    window.location.href = '/?page=slot'; // Paksa browser reload ke halaman Slot
  }}
  className="fixed bottom-24 right-4 z-50 bg-gradient-to-r from-amber-500 to-red-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
  title="LUCKY SPIN"
>
  <span className="text-3xl">🎰</span>
</button>
      {/* ======================= */}
      <div className="relative mx-auto min-h-screen max-w-md bg-slate-50 shadow-xl">
        <header className="relative px-5 pb-8 pt-6 text-white bg-blue-700 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/header-bg.png')" }}>
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-white/20 backdrop-blur-sm p-2"><Wallet size={23} /></div>
                <div><h1 className="text-xl font-extrabold tracking-wide">LukingzzStore</h1><p className="text-xs text-blue-100">Toko saldo digital</p></div>
              </div>
              <button type="button" aria-label="Notifikasi" onClick={() => setActiveTab('orders')} className="rounded-full bg-white/20 backdrop-blur-sm p-2"><Bell size={20} /></button>
            </div>
            <div className="mt-7">
              <p className="text-sm text-blue-100">Selamat datang{userProfile?.full_name ? `, ${userProfile.full_name}` : ''} di LukingzzStore</p>
              <h2 className="mt-1 text-2xl font-bold">
                {activeTab === 'home' && 'ISI SALDO DIGITALMU'}
                {activeTab === 'orders' && 'Pesanan saya'}
                {activeTab === 'track' && 'Lacak pesanan'}
                {activeTab === 'account' && 'Akun pelanggan'}
              </h2>
              <p className="mt-2 max-w-xs text-sm text-blue-100">
                {activeTab === 'home' && 'Praktis, mudah, dan nyaman untuk kebutuhan transaksi digital.'}
                {activeTab === 'orders' && 'Riwayat semua pesanan yang terhubung ke akun Anda.'}
                {activeTab === 'track' && 'Periksa perkembangan pesanan menggunakan kode pelacakan.'}
                {activeTab === 'account' && (isLoggedIn ? 'Informasi akun Anda.' : 'Masuk atau daftar untuk mulai memesan.')}
              </p>
            </div>
            {activeTab === 'home' && (
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/20 p-2"><Zap size={22} /></div>
                  <div><p className="font-semibold">Layanan digital</p><p className="text-xs text-blue-100">{isLoggedIn ? 'Pilih produk, lalu pilih variannya' : 'Login untuk mulai memesan'}</p></div>
                </div>
                <ChevronRight size={20} />
              </div>
            )}
          </div>
        </header>

        <main className="bg-gradient-to-b from-blue-50 to-slate-50 min-h-screen space-y-5 px-5 py-6">
          {activeTab === 'home' && (
            <>
              {!isLoggedIn && (
                <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole size={22} className="mt-0.5 shrink-0 text-blue-700" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-blue-800">Masuk untuk memesan</p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">Anda bisa lihat-lihat produk dulu. Saat mau pesan, silakan masuk atau daftar.</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => { setUserAuthMode('login'); setUserPage('login'); setUserFormError(''); setUserForm({ phone: '', password: '', full_name: '' }) }} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">Masuk</button>
                        <button type="button" onClick={() => { setUserAuthMode('register'); setUserPage('register'); setUserFormError(''); setUserForm({ phone: '', password: '', full_name: '' }) }} className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Daftar</button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {/* BANNER BERGULIR (CAROUSEL) */}
              <div className="relative w-full h-32 mb-4 rounded-2xl overflow-hidden shadow-sm">
                {banners.map((banner, index) => (
                  <img
                    key={index}
                    src={banner}
                    alt={`Banner Promo ${index + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                      index === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                  />
                ))}
                
                {/* Titik Indikator (Dot) di bawah banner */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBanner(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentBanner ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {productsLoading && (<section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><RefreshCw size={24} className="mx-auto mb-2 animate-spin text-blue-600" /><p className="text-sm font-semibold text-slate-600">Memuat daftar layanan...</p></section>)}
              {!productsLoading && productsError && (<section className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex items-start gap-2 text-red-700"><AlertCircle size={20} className="mt-0.5 shrink-0" /><div><p className="text-sm font-bold">Gagal memuat layanan</p><p className="mt-1 text-xs leading-5">{productsError}</p></div></div></section>)}
              {!productsLoading && !productsError && products.length === 0 && (<section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"><PackageCheck size={30} className="mx-auto mb-2 text-slate-300" /><p className="text-sm font-semibold text-slate-600">Belum ada produk</p></section>)}

              {!productsLoading && !productsError && products.length > 0 && CATEGORY_ORDER.map((category) => {
                const items = groupedProducts[category]
                if (items.length === 0) return null
                return (
                  <section key={category}>
                    <div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-800">{category}</h3></div>
                    <div className="grid grid-cols-4 gap-2">
                      {items.map((item) => {
                        const hasVariants = item.variants.some((v) => v.selling_price > 0)
                        const isSelected = selectedProductId === item.id
                        return (
                          <button 
                            key={item.id} 
                            type="button" 
                            onClick={() => { setSelectedProductId(item.id); setSelectedVariantId(item.variants.find((v) => v.selling_price > 0)?.id || ''); setMessage(''); setCreatedOrder(null) }} 
                            className={`relative flex flex-col items-center gap-2 rounded-2xl border p-2 text-center transition shadow-sm hover:shadow-md ${isSelected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}
                          >
                            {renderProductIcon(item)}
                            <span className="line-clamp-2 text-xs font-semibold leading-tight">{item.name}</span>
                            {!hasVariants && String(item.code || '').toUpperCase() !== 'BANKTRANSFER' && (<span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">Belum tersedia</span>)}
                          </button>
                          
                        )
                      })}
                    </div>
                  </section>
                )
              })}
                      {/* BAGIAN HADIAH / TUKAR POIN (Desain Sejajar Produk) */}
              {isLoggedIn && rewards.length > 0 && (
                <section className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">🎁 Tukar Poin</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {rewards.map((reward) => (
                      <div key={reward.id} className="relative flex flex-col items-center justify-between gap-1 rounded-2xl border border-amber-200 bg-amber-50/50 p-2 text-center shadow-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-3xl mb-1">💎</span>
                          <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-slate-800">{reward.name}</span>
                          <span className="mt-1 text-[9px] font-bold text-amber-600">{reward.points_required} Poin</span>
                        </div>
                        
                        <div className="w-full mt-1">
                          {redeemId === reward.id ? (
                            <div className="w-full">
                              <input 
                                type="text" 
                                placeholder="ID Game" 
                                value={redeemDestination}
                                onChange={(e) => setRedeemDestination(e.target.value)}
                                className="w-full text-[9px] border border-slate-300 rounded p-1 mb-1 outline-none text-center"
                              />
                              <button 
                                onClick={async () => {
                                  if (!redeemDestination) return alert('Masukkan ID Game!');
                                  setIsRedeeming(true);
                                  const token = localStorage.getItem('digitalku_user_token');
                                  try {
                                    const res = await fetch(`${API_URL}/api/rewards/redeem`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ reward_id: reward.id, destination_number: redeemDestination })
                                    });
                                    const data = await res.json();
                                    if (data.success) { alert(data.message); setRedeemId(null); setRedeemDestination(''); await loadUserBalance(); await loadUserOrders(); await loadRewards(); }
                                    else alert(data.message);
                                  } catch (err) { alert('Gagal menukar poin.'); }
                                  finally { setIsRedeeming(false); }
                                }}
                                disabled={isRedeeming}
                                className="w-full rounded-full bg-amber-500 py-1 text-[9px] font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                              >
                                {isRedeeming ? 'Proses...' : 'Tukar'}
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setRedeemId(reward.id); setRedeemDestination(''); }}
                              disabled={userPoints < reward.points_required}
                              className={`w-full rounded-full py-1 text-[9px] font-bold transition ${userPoints < reward.points_required ? 'bg-slate-200 text-slate-500' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                            >
                              {userPoints < reward.points_required ? 'Kurang' : 'Tukar'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!productsLoading && !productsError && products.length > 0 && (
                <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${selectedProduct ? 'block' : 'hidden'}`}>
                  <div className="mb-4 flex items-center gap-2"><ArrowDownUp className="text-blue-700" size={20} /><h3 className="font-bold">Formulir pembelian</h3></div>
                  <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Produk dipilih</span><span className="text-right font-semibold">{selectedProduct?.name || '-'}</span></div>
                  </div>
                  {selectedProduct && !productHasVariants && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                      <div><p className="text-sm font-bold text-amber-800">Produk belum tersedia</p><p className="mt-1 text-xs leading-5 text-amber-700">Produk ini belum memiliki varian aktif dengan harga jual. Silakan pilih produk lain.</p></div>
                    </div>
                  )}
                  {productHasVariants && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium">Pilih varian</label>
                      <div className="grid grid-cols-2 gap-2">
                        {activeVariants.map((variant) => {
                          const isChosen = selectedVariantId === variant.id
                          return (
                            <button key={variant.id} type="button" onClick={() => { setSelectedVariantId(variant.id); setMessage(''); setCreatedOrder(null) }} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${isChosen ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                              <p className="font-bold">{variant.variant_name}</p>
                              <p className="mt-1 text-xs font-bold text-slate-800">{formatRupiah(Number(variant.selling_price))}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {isLoggedIn && (
                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium">Metode Pembayaran</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('qris')}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${paymentMethod === 'qris' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600'}`}
                        >
                          QRIS 
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('saldo')}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${paymentMethod === 'saldo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                        >
                          Saldo 
                        </button>
                      </div>
                      
                      {paymentMethod === 'saldo' && (
                        <div className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                          Saldo Anda saat ini: <strong>{formatRupiah(userBalance)}</strong>. 
                          {userBalance < total ? ' Saldo tidak cukup, silakan Top Up.' : ' Transaksi akan langsung selesai.'}
                        </div>
                      )}
                    </div>
                  )}

                  {isLoggedIn && userProfile && (
                    <div className="mb-3 rounded-xl bg-blue-50 p-3 text-xs">
                      <div className="flex justify-between gap-3"><span className="text-blue-700">Pemesan</span><span className="font-semibold text-blue-800">{userProfile.full_name || '-'} · {userProfile.phone}</span></div>
                    </div>
                  )}

                  {isBankTransferProduct ? (
                    <div className="mb-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">Bank tujuan</label>
                        <select value={transferBank} onChange={(e) => setTransferBank(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500">
                          {['BCA','BRI','BNI','Mandiri','BSI','CIMB Niaga','Bank Jago','SeaBank','BTN','Danamon','Permata','Bank lainnya'].map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">Nomor rekening tujuan</label>
                        <input type="text" inputMode="numeric" value={transferAccountNumber} onChange={(e) => setTransferAccountNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 30))} placeholder="Masukkan nomor rekening" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">Nama pemilik rekening</label>
                        <input type="text" value={transferAccountName} onChange={(e) => setTransferAccountName(e.target.value.slice(0, 80))} placeholder="Nama sesuai rekening" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold">Nominal transfer (Rp)</label>
                        <input type="number" min="10000" max="1000000" step="1000" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} placeholder="Minimal 10.000" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">Nominal Rp10.000–Rp1.000.000, kelipatan Rp1.000. Admin akan memproses transfer secara manual setelah pembayaran diverifikasi.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="mb-2 block text-sm font-medium">
                        {selectedProduct && getCategoryForProduct(selectedProduct) === 'Game' ? 'Masukkan User ID' : 'Nomor tujuan isi saldo'}
                      </label>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={selectedProduct && getCategoryForProduct(selectedProduct) === 'Game' ? 'Masukkan ID Game Anda' : 'Contoh: 08xxxxxxxxxx'} className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </>
                  )}

                  <div className="my-5 border-t border-dashed border-slate-200" />
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">{isBankTransferProduct ? 'Nominal transfer' : 'Harga varian'}</span><span className="font-semibold">{formatRupiah(selectedAmount)}</span></div>

                    <div className="flex justify-between"><span className="text-slate-500">Biaya layanan</span><span className="font-semibold">{formatRupiah(serviceFee)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><span className="font-bold">Total pembayaran</span><span className="font-extrabold text-slate-900">{formatRupiah(total)}</span></div>
                  </div>

                  <button type="button" onClick={handleOrder} disabled={isSubmitting || productsLoading || (paymentMethod === 'saldo' && userBalance < total)} className="mt-5 w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
                    {productsLoading ? 'Memuat layanan...' : isSubmitting ? 'Menyimpan pesanan...' : !isLoggedIn ? 'Login untuk pesan' : !canOrder ? 'Pilih varian terlebih dahulu' : paymentMethod === 'saldo' && userBalance < total ? 'Saldo Tidak Cukup' : 'Buat pesanan'}
                  </button>
                  {message && (<div className={`mt-3 rounded-xl p-3 text-sm ${createdOrder ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>{message}</div>)}
                  {createdOrder && (
                    <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
                      <div className="flex items-center gap-2 font-bold text-emerald-700"><ShieldCheck size={20} />Pesanan tersimpan</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Nomor pesanan</span><span className="text-right font-bold">{createdOrder.order_number}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Layanan</span><span className="font-semibold">{createdOrder.product}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Nominal</span><span className="font-semibold">{formatRupiah(createdOrder.amount)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Total</span><span className="font-extrabold text-blue-700">{formatRupiah(createdOrder.total_amount)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Status pesanan</span><span className="font-semibold">{statusLabel(createdOrder.order_status)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Status pembayaran</span><span className="font-semibold">{statusLabel(createdOrder.payment_status)}</span></div>
                      </div>
                      {createdOrder.payment_status === 'pending' && (<QrisPayment totalAmount={Number(createdOrder.total_amount)} orderNumber={createdOrder.order_number} />)}
                      <div><p className="mb-1 text-xs font-semibold text-slate-500">Kode pelacakan</p><p className="break-all rounded-lg bg-slate-50 p-2 font-mono text-xs text-slate-700">{createdOrder.tracking_token}</p></div>
                      <button type="button" onClick={() => openTracking(createdOrder)} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700">Lanjut ke Pembayaran</button>
                    </div>
                  )}
                </section>
              )}

              <section className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm"><ShieldCheck className="shrink-0 text-emerald-600" size={22} /><span className="text-xs font-medium">Transaksi diperiksa admin</span></div>
                <div className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm"><Clock className="shrink-0 text-blue-600" size={22} /><span className="text-xs font-medium">Status pesanan</span></div>
              </section>
            </>
          )}

          {activeTab === 'orders' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><ClipboardList size={23} /></div>
                    <div><h3 className="font-bold">Riwayat pesanan</h3><p className="text-xs text-slate-500">Dari akun Anda</p></div>
                  </div>
                  {isLoggedIn && (<button type="button" onClick={loadUserOrders} disabled={userOrdersLoading} className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={13} className={userOrdersLoading ? 'animate-spin' : 'inline'} /></button>)}
                </div>
              </div>

              {!isLoggedIn && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
                  <ReceiptText size={38} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="font-bold text-slate-700">Belum login</h3>
                  <p className="mt-2 text-sm text-slate-500">Masuk untuk melihat riwayat pesanan Anda.</p>
                  <button type="button" onClick={() => { setUserAuthMode('login'); setUserPage('login'); setUserFormError('') }} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Masuk</button>
                </div>
              )}

              {isLoggedIn && userOrdersError && (<div className="rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex items-start gap-2 text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p className="text-sm">{userOrdersError}</p></div></div>)}
              {isLoggedIn && userOrdersLoading && (<div className="rounded-2xl border border-slate-200 bg-white p-6 text-center"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-blue-600" /><p className="text-sm text-slate-500">Memuat riwayat...</p></div>)}
              {isLoggedIn && !userOrdersLoading && !userOrdersError && userOrders.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center">
                  <ReceiptText size={38} className="mx-auto mb-3 text-slate-300" />
                  <h3 className="font-bold text-slate-700">Belum ada pesanan</h3>
                  <p className="mt-2 text-sm text-slate-500">Pesanan yang Anda buat akan tampil di sini.</p>
                  <button type="button" onClick={() => setActiveTab('home')} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Mulai pesan</button>
                </div>
              )}
              {isLoggedIn && !userOrdersLoading && userOrders.length > 0 && (
                <div className="space-y-3">
                  {userOrders.map((order) => (
                    <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-400">NOMOR PESANAN</span>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusColor(order.order_status)}`}>{statusLabel(order.order_status)}</span>
                      </div>
                      <p className="mt-2 break-all text-sm font-extrabold text-slate-800">{order.order_number}</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Layanan</span><span className="text-right font-semibold">{order.product_name || '-'}{order.variant_name_snapshot ? ` · ${order.variant_name_snapshot}` : ''}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Nomor tujuan</span><span className="font-semibold">{order.destination_number}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Total</span><span className="font-extrabold text-blue-700">{formatRupiah(Number(order.total_amount))}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Pembayaran</span><span className="font-semibold">{statusLabel(order.payment_status || '')}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-500">Tanggal</span><span className="text-right text-xs font-semibold">{formatDate(order.created_at)}</span></div>
                      </div>
                      {order.payment_status === 'pending' && (<QrisPayment totalAmount={Number(order.total_amount)} orderNumber={order.order_number} />)}
                      <button type="button" onClick={() => openTracking({ order_number: order.order_number, tracking_token: order.tracking_token })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-sm font-bold text-white hover:bg-blue-800"><Search size={15} />Lacak pesanan</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'track' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Search size={23} /></div>
                  <div><h3 className="font-bold">Lacak status pesanan</h3><p className="text-xs text-slate-500">Masukkan nomor pesanan dan kode rahasia.</p></div>
                </div>
                <form onSubmit={handleTrackOrder} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Nomor pesanan</label>
                    <input type="text" value={trackingOrderNumber} onChange={(e) => { setTrackingOrderNumber(e.target.value); setTrackedOrder(null); setTrackingMessage('') }} placeholder="Contoh: DK-1234567890123-ABCDEF" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Kode pelacakan</label>
                    <input type="text" value={trackingToken} onChange={(e) => { setTrackingToken(e.target.value); setTrackedOrder(null); setTrackingMessage('') }} placeholder="Masukkan kode pelacakan" required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <button type="submit" disabled={isTracking} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3.5 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {isTracking ? <><RefreshCw size={18} className="animate-spin" />Memeriksa pesanan...</> : <><Search size={18} />Cari pesanan</>}
                  </button>
                </form>
                {trackingMessage && (<div className={`mt-4 rounded-xl p-3 text-sm ${trackedOrder ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{trackingMessage}</div>)}
              </div>
              {trackedOrder && (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <PackageCheck size={23} className="text-emerald-600" />
                    <div><h3 className="font-bold">Detail pesanan ditemukan</h3><p className="text-xs text-slate-500">Data terbaru dari server LukingzzStore</p></div>
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-400">NOMOR PESANAN</p>
                  <p className="mt-1 break-all font-extrabold text-slate-800">{trackedOrder.order_number}</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Layanan</span><span className="text-right font-semibold">{trackedOrder.product_name || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Nomor tujuan</span><span className="font-semibold">{trackedOrder.destination_number}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Nominal saldo</span><span className="font-semibold">{formatRupiah(Number(trackedOrder.amount))}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Biaya layanan</span><span className="font-semibold">{formatRupiah(Number(trackedOrder.service_fee))}</span></div>
                    <div className="flex justify-between gap-3 border-t border-slate-100 pt-3"><span className="font-bold">Total pembayaran</span><span className="font-extrabold text-blue-700">{formatRupiah(Number(trackedOrder.total_amount))}</span></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs text-slate-500">Status pesanan</p><span className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${statusColor(trackedOrder.order_status)}`}>{statusLabel(trackedOrder.order_status)}</span></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs text-slate-500">Status pembayaran</p><span className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${statusColor(trackedOrder.payment_status || '')}`}>{statusLabel(trackedOrder.payment_status || '')}</span></div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <div className="flex justify-between gap-3"><span>Metode pembayaran</span><span className="font-semibold">{trackedOrder.payment_method || '-'}</span></div>
                    <div className="flex justify-between gap-3"><span>Dibuat pada</span><span className="text-right font-semibold">{formatDate(trackedOrder.created_at)}</span></div>
                    <div className="flex justify-between gap-3"><span>Pembaruan terakhir</span><span className="text-right font-semibold">{formatDate(trackedOrder.updated_at)}</span></div>
                  </div>
                  {trackedOrder.payment_status === 'pending' && (<QrisPayment totalAmount={Number(trackedOrder.total_amount)} orderNumber={trackedOrder.order_number} />)}
                  {trackedOrder.payment_status === 'verified' && (<div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-emerald-800">Pembayaran telah diverifikasi oleh admin.</p></div>)}
                </article>
              )}
            </section>
          )}

          {activeTab === 'account' && (
            <section className="space-y-4">
              {isLoggedIn && userProfile ? (
                <>
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg">
                    <p className="text-sm text-blue-100">Saldo LukingzzStore</p>
                    <h2 className="mt-1 text-3xl font-extrabold">{formatRupiah(userBalance)}</h2>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-blue-100">Poin: <span className="font-bold">{userPoints}</span></p>
                        {userPoints >= 100 && (
                          <button type="button" onClick={handleRedeemPoints} className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600">
                            Tukar Poin
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setIsWithdrawOpen(true)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600">Tarik Saldo</button>
                        <button type="button" onClick={() => setIsTopupOpen(true)} className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm hover:bg-white/30">+ Isi Saldo</button>
                      </div>
                    </div>
                  </div>

                  {missionData && (
                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-amber-900">Misi Spesial</h3>
                          <p className="text-xs text-amber-700">Selesaikan 15 transaksi, dapatkan saldo Rp 20.000!</p>
                        </div>
                      </div>
                      
                      <div className="mb-3 flex items-center justify-between text-xs font-semibold">
                        <span className="text-amber-800">Progres Anda</span>
                        <span className="text-amber-900">{missionData.total_transactions} / {missionData.target_transactions} Transaksi</span>
                      </div>
                      
                      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200">
                        <div 
                          className="h-full bg-amber-500 transition-all" 
                          style={{ width: `${Math.min(100, (missionData.total_transactions / missionData.target_transactions) * 100)}%` }}
                        />
                      </div>

                      <div className="mt-4">
                        {missionData.has_claimed ? (
                          <div className="rounded-xl bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-700">
                            ✓ Bonus Misi Sudah Diklaim
                          </div>
                        ) : missionData.can_claim ? (
                          <button 
                            type="button" 
                            onClick={handleClaimMission} 
                            disabled={claimingMission}
                            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-200 hover:bg-amber-600 disabled:opacity-50"
                          >
                            {claimingMission ? 'Memproses...' : 'Klaim Bonus Rp 20.000'}
                          </button>
                        ) : (
                          <div className="rounded-xl bg-white/50 p-3 text-center text-xs text-amber-700">
                            Kurang {missionData.target_transactions - missionData.total_transactions} transaksi lagi untuk mendapatkan bonus.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {missionLevel2Data && (
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-5 shadow-sm">
                      <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-purple-900">Misi Spesial Level 2</h3>
                          <p className="text-xs text-purple-700">Selesaikan 50 transaksi berhasil, dapatkan saldo Rp 50.000!</p>
                        </div>
                      </div>

                      <div className="mb-3 flex items-center justify-between text-xs font-semibold">
                        <span className="text-purple-800">Progres Anda</span>
                        <span className="text-purple-900">{missionLevel2Data.total_transactions} / {missionLevel2Data.target_transactions} Transaksi</span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-purple-200">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${Math.min(100, (missionLevel2Data.total_transactions / missionLevel2Data.target_transactions) * 100)}%` }}
                        />
                      </div>

                      <div className="mt-4">
                        {missionLevel2Data.has_claimed ? (
                          <div className="rounded-xl bg-emerald-100 p-3 text-center text-xs font-bold text-emerald-700">
                            ✓ Bonus Misi Level 2 Sudah Diklaim
                          </div>
                        ) : missionLevel2Data.can_claim ? (
                          <button
                            type="button"
                            onClick={handleClaimMissionLevel2}
                            disabled={claimingMissionLevel2}
                            className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-200 hover:bg-purple-700 disabled:opacity-50"
                          >
                            {claimingMissionLevel2 ? 'Memproses...' : 'Klaim Bonus Rp 50.000'}
                          </button>
                        ) : (
                          <div className="rounded-xl bg-white/60 p-3 text-center text-xs text-purple-700">
                            Kurang {Math.max(0, missionLevel2Data.target_transactions - missionLevel2Data.total_transactions)} transaksi berhasil lagi untuk mendapatkan bonus.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><UserRound size={29} /></div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{userProfile.full_name || 'Pelanggan'}</h3>
                        <p className="text-xs text-slate-500">{userProfile.phone}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button type="button" onClick={() => setActiveTab('orders')} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Pesanan Saya</button>
                      <button type="button" onClick={handleUserLogout} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100">Keluar</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><UserRound size={29} /></div>
                    <div><h3 className="font-bold text-slate-800">Belum login</h3><p className="text-xs text-slate-500">Masuk atau daftar untuk memesan</p></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => { setUserAuthMode('login'); setUserPage('login'); setUserFormError(''); setUserForm({ phone: '', password: '', full_name: '' }) }} className="rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800">Masuk</button>
                    <button type="button" onClick={() => { setUserAuthMode('register'); setUserPage('register'); setUserFormError(''); setUserForm({ phone: '', password: '', full_name: '' }) }} className="rounded-xl border border-blue-300 bg-white py-3 text-sm font-bold text-blue-700 hover:bg-blue-50">Daftar</button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-bold">Menu</h3>
                <button type="button" onClick={() => setActiveTab('orders')} className="mt-3 flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-slate-50">
                  <span className="flex items-center gap-3"><ReceiptText size={20} className="text-blue-700" /><span className="text-sm font-semibold">Pesanan saya</span></span>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                <button type="button" onClick={() => setActiveTab('track')} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-slate-50">
                  <span className="flex items-center gap-3"><Search size={20} className="text-blue-700" /><span className="text-sm font-semibold">Lacak pesanan</span></span>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                <button type="button" onClick={() => { setLoginMessage(''); setPage('login') }} className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-slate-50">
                  <span className="flex items-center gap-3"><LockKeyhole size={20} className="text-blue-700" /><span className="text-sm font-semibold">Login administrator</span></span>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                <WhatsappButton />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <CircleHelp size={21} className="mt-0.5 shrink-0 text-blue-700" />
                  <div><h3 className="text-sm font-bold text-blue-800">Butuh bantuan?</h3><p className="mt-1 text-xs leading-5 text-blue-700">Simpan nomor pesanan dan kode pelacakan untuk memeriksa status.</p></div>
                </div>
              </div>
              <p className="pb-3 text-center text-xs text-slate-400">LukingzzStore · Layanan saldo digital</p>
            </section>
          )}
        </main>

        {isTopupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              {!topupQrisData ? (
                <>
                  <h3 className="text-lg font-bold text-slate-800">Isi Saldo</h3>
                  <p className="mt-1 text-xs text-slate-500">Pilih nominal isi saldo. Pembayaran akan diverifikasi manual oleh Admin.</p>
                  <form onSubmit={handleTopup} className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Nominal (Rp)</label>
                      <input type="number" min="10000" max="5000000" step="10000" value={topupAmount} onChange={(e) => setTopupAmount(Number(e.target.value))} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="button" onClick={() => setIsTopupOpen(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                      <button type="submit" disabled={isUserSubmitting} className="flex-1 rounded-xl bg-blue-700 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                        {isUserSubmitting ? 'Memproses...' : 'Lanjut Bayar'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-800">Pembayaran Top Up</h3>
                    <button onClick={() => { setIsTopupOpen(false); setTopupQrisData(null); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                      <X size={18} />
                    </button>
                  </div>
                  <QrisPayment totalAmount={topupQrisData.amount} orderNumber={`TOPUP-${topupQrisData.id.slice(0, 8)}`} />
                  <div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                    Pastikan nominal pembayaran sesuai dengan <strong>Rp {topupQrisData.amount.toLocaleString('id-ID')}</strong>. Saldo akan ditambahkan setelah Admin memverifikasi pembayaran.
                  </div>
                  <button type="button" onClick={() => { setIsTopupOpen(false); setTopupQrisData(null); }} className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    Saya Sudah Bayar / Tutup
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isWithdrawOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h3 className="text-lg font-bold text-slate-800">Tarik Saldo (Withdraw)</h3>
                <button onClick={() => { setIsWithdrawOpen(false); setWithdrawError(''); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
              Pastikan Nama & Nomor Rekening Sesuai,Proses 1x24 jam oleh Admin.
              </p>
              <form onSubmit={handleWithdraw} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nominal Tarik (Rp)</label>
                  <input type="number" min="10000" step="1000" value={withdrawForm.amount} onChange={(e) => setWithdrawForm((p) => ({ ...p, amount: e.target.value }))} required placeholder="Contoh: 50000" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                  <p className="mt-1 text-[10px] text-slate-400">Saldo Anda: {formatRupiah(userBalance)}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Bank / E-Wallet</label>
                  <input type="text" value={withdrawForm.bank_name} onChange={(e) => setWithdrawForm((p) => ({ ...p, bank_name: e.target.value }))} required placeholder="Contoh: BCA, DANA, GoPay" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Rekening / HP</label>
                  <input type="text" value={withdrawForm.account_number} onChange={(e) => setWithdrawForm((p) => ({ ...p, account_number: e.target.value }))} required placeholder="Contoh: 1234567890" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Atas Nama</label>
                  <input type="text" value={withdrawForm.account_name} onChange={(e) => setWithdrawForm((p) => ({ ...p, account_name: e.target.value }))} required placeholder="Nama pemilik rekening" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" />
                </div>
                {withdrawError && (<div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{withdrawError}</div>)}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setIsWithdrawOpen(false); setWithdrawError(''); }} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                  <button type="submit" disabled={submittingWithdraw} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                    {submittingWithdraw ? 'Memproses...' : 'Ajukan Tarik'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        
        <nav className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-slate-200 bg-white px-2 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <button type="button" onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-700' : 'text-slate-400'}`}><Home size={21} /><span className={`text-[10px] ${activeTab === 'home' ? 'font-semibold' : ''}`}>Beranda</span></button>
          <button type="button" onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 ${activeTab === 'orders' ? 'text-blue-700' : 'text-slate-400'}`}><ReceiptText size={21} /><span className={`text-[10px] ${activeTab === 'orders' ? 'font-semibold' : ''}`}>Pesanan</span></button>
          <button type="button" onClick={() => { setTrackedOrder(null); setTrackingMessage(''); setActiveTab('track') }} className={`flex flex-col items-center gap-1 ${activeTab === 'track' ? 'text-blue-700' : 'text-slate-400'}`}><Search size={21} /><span className={`text-[10px] ${activeTab === 'track' ? 'font-semibold' : ''}`}>Lacak</span></button>
          <button type="button" onClick={() => setActiveTab('account')} className={`flex flex-col items-center gap-1 ${activeTab === 'account' ? 'text-blue-700' : 'text-slate-400'}`}><UserRound size={21} /><span className={`text-[10px] ${activeTab === 'account' ? 'font-semibold' : ''}`}>{isLoggedIn ? 'Akun' : 'Masuk'}</span></button>
        </nav>
      </div>
    </div>
  )
}

export default App