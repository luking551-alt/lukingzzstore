const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const { rateLimit } = require('express-rate-limit')
require('dotenv').config()
// =====================================================
// SLOT MACHINE CONFIG (TAMBAHKAN SETELAH section 1)
// =====================================================

const SLOT_MIN_BET = 100
const SLOT_MAX_BET = 100000
const SLOT_BET_STEP = 100
const SLOT_BIG_WIN_THRESHOLD = 10000   // Rupiah, threshold untuk log activity
const SLOT_MAX_PAYOUT = 1000000; // Batas maksimal kemenangan per spin (Rp 1.000.000)

// 3 reel, masing-masing 12 simbol dengan distribusi identik
// Probabilitas simbol: 🍒 3/12, 🍋 3/12, 🍊 2/12, 🔔 2/12, ⭐ 1/12, 💎 1/12
const SLOT_REELS = [
  [
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png'
  ],
  [
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png'
  ],
  [
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911931.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911956.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911959.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911960.png',
    'https://cdn-icons-png.flaticon.com/512/6911/6911964.png',
    'https://cdn-icons-png.flaticon.com/512/2361/2361722.png'
  ]
];

// Paytable: kombinasi 3-simbol identik → multiplier dari bet
// RTP teoretis = 91.0% → House Edge = 9.0%
// Kita gunakan URL gambar sebagai "kunci" untuk menentukan hadiah
const SLOT_PAYTABLE = {
  'https://cdn-icons-png.flaticon.com/512/6911/6911964.png': 50, // Mahkota (Paling langka)
  'https://cdn-icons-png.flaticon.com/512/6911/6911931.png': 20, // Bintang
  'https://cdn-icons-png.flaticon.com/512/6911/6911960.png': 10, // Kado
  'https://cdn-icons-png.flaticon.com/512/6911/6911959.png': 5,  // Kue
  'https://cdn-icons-png.flaticon.com/512/6911/6911956.png': 2,  // Mesin Cuci
  'https://cdn-icons-png.flaticon.com/512/2361/2361722.png': 0   // Penjepit (Tidak ada hadiah)
};

// 2 cherry (reel 1 & 2 cherry, reel 3 bebas) → 1x
const SLOT_TWO_CHERRY_MULT = 1

// 1. Generate 5 Reel x 3 Baris
function spinSlotReels() {
  const grid = [];
  for (let row = 0; row < 3; row++) {
    const rowSymbols = [];
    for (let col = 0; col < 5; col++) {
      // Menggunakan probabilitas yang sama
      const randomIndex = crypto.randomInt(0, 6);
      rowSymbols.push(SLOT_REELS[0][randomIndex]);
    }
    grid.push(rowSymbols);
  }
  return { grid };
}

// 2. Hitung Kemenangan (Cek Garis Tengah, Atas, Bawah)
function calculateSlotPayout(grid, bet) {
  let totalWin = 0;
  let winningLines = [];

  for (let row = 1; row < 2; row++) {
    const line = grid[row];
    
    // Cek jika 3 simbol pertama sama persis
    if (line[0] === line[1] && line[1] === line[2]) {
      let multiplier = SLOT_PAYTABLE[line[0]] || 0; // Ambil hadiah dari URL gambar

      if (multiplier > 0) {
        const win = bet * multiplier;
        totalWin += win;
        winningLines.push({ row, symbols: line.slice(0, 3), win });
      }
    }
  }
    // === TERAPKAN MAX PAYOUT ===
  if (totalWin > SLOT_MAX_PAYOUT) {
    totalWin = SLOT_MAX_PAYOUT;
  }
  // ===========================

  return { win: totalWin, winningLines };
}

// Rate limit khusus slot: max 60 spin / menit per IP
const slotLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak spin. Coba lagi sebentar.' },
})
const app = express()
const PORT = process.env.PORT || 3000

// =====================================================
// 1. KONFIGURASI DAN KEAMANAN
// =====================================================

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET belum tersedia atau terlalu pendek di .env')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum tersedia di .env')
}

if (!process.env.ADMIN_SETUP_KEY) {
  throw new Error('ADMIN_SETUP_KEY belum tersedia di .env')
}

const JWT_SECRET = process.env.JWT_SECRET
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY
const SERVICE_FEE = 0
const BANK_TRANSFER_SERVICE_FEE = 5000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

app.use(cors())
app.use(express.json({ limit: '10kb' }))

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const userAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const userOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const paymentVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const orderStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const productLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function normalizeDestination(value) {
  return String(value || '').trim().replace(/\s+/g, '')
}

function validSetupKey(req) {
  const supplied = req.headers['x-admin-setup-key']
  if (typeof supplied !== 'string') return false
  const a = Buffer.from(supplied)
  const b = Buffer.from(ADMIN_SETUP_KEY)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function authenticateAdmin(req, res, next) {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token admin tidak ditemukan.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'DIGITALKU',
      audience: 'DIGITALKU-ADMIN',
    })
    if (!decoded.adminId) {
      return res.status(401).json({ success: false, message: 'Token admin tidak valid.' })
    }
    req.admin = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi admin tidak valid atau sudah kedaluwarsa.' })
  }
}

function authenticateUser(req, res, next) {
  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null

  if (!token) {
    return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'DIGITALKU',
      audience: 'DIGITALKU-USER',
    })
    if (!decoded.userId) {
      return res.status(401).json({ success: false, message: 'Token user tidak valid.' })
    }
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login kembali.' })
  }
}

async function logActivity(client, adminId, action, entityType, entityId, description, ipAddress) {
  await client.query(
    `INSERT INTO activity_logs
      (admin_id, action, entity_type, entity_id, description, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [adminId, action, entityType, entityId, description, ipAddress || null]
  )
}

function handleError(res, error, message = 'Terjadi kesalahan pada server.') {
  console.error(error)

  if (error.code === '23505') {
    return res.status(409).json({ success: false, message: 'Data tersebut sudah digunakan.' })
  }
  if (error.code === '23503') {
    return res.status(400).json({ success: false, message: 'Data terkait tidak ditemukan atau masih digunakan.' })
  }
  if (error.code === '23514') {
    return res.status(400).json({ success: false, message: 'Nilai data tidak memenuhi aturan database.' })
  }

  return res.status(500).json({ success: false, message })
}

// =====================================================
// 2. HALAMAN PEMERIKSAAN SERVER
// =====================================================



app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'online' })
})

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time')
    res.json({ success: true, database: 'connected', server_time: result.rows[0].server_time })
  } catch (error) {
    handleError(res, error, 'Database tidak dapat dihubungi.')
  }
})

// =====================================================
// 3. PRODUK UNTUK PELANGGAN
// =====================================================

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id, p.name, p.code, p.description,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'variant_name', v.variant_name,
              'code', v.code,
              'description', v.description,
              'selling_price', v.selling_price
            )
            ORDER BY v.selling_price ASC
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'::json
        ) AS variants
      FROM products p
      LEFT JOIN product_variants v
        ON v.product_id = p.id AND v.is_active = TRUE
      WHERE p.is_active = TRUE
      GROUP BY p.id
      ORDER BY p.name ASC
    `)
    res.json({ success: true, products: result.rows })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar produk.')
  }
})

// =====================================================
// 4. USER: REGISTER
// =====================================================

app.post('/api/users/register', userAuthLimiter, async (req, res) => {
  const rawPhone = String(req.body.phone || '').trim()
  const rawPassword = String(req.body.password || '')
  const rawFullName = String(req.body.full_name || '').trim()
  const phone = normalizePhone(rawPhone)

  if (phone.length < 10 || phone.length > 15) {
    return res.status(400).json({ success: false, message: 'Nomor HP harus berisi 10–15 angka.' })
  }
  if (rawPassword.length < 8 || rawPassword.length > 128) {
    return res.status(400).json({ success: false, message: 'Password harus 8–128 karakter.' })
  }
  if (rawFullName.length > 100) {
    return res.status(400).json({ success: false, message: 'Nama lengkap maksimal 100 karakter.' })
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1 LIMIT 1', [phone])
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Nomor HP sudah terdaftar. Silakan login.' })
    }

    const passwordHash = await bcrypt.hash(rawPassword, 12)
const referredBy = req.body.referred_by ? req.body.referred_by.trim().toUpperCase() : null;
const result = await pool.query(
  `INSERT INTO users (phone, password_hash, full_name, is_active, referred_by)
   VALUES ($1, $2, $3, TRUE, $4)
   RETURNING id, phone, full_name, is_active, created_at`,
  [phone, passwordHash, rawFullName || null, referredBy]
)

    const user = result.rows[0]
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d', issuer: 'DIGITALKU', audience: 'DIGITALKU-USER' }
    )

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil. Selamat datang di DIGITALKU!',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        full_name: user.full_name,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mendaftar. Coba lagi.')
  }
})

// =====================================================
// 5. USER: LOGIN
// =====================================================

app.post('/api/users/login', userAuthLimiter, async (req, res) => {
  const rawPhone = String(req.body.phone || '').trim()
  const rawPassword = String(req.body.password || '')
  const phone = normalizePhone(rawPhone)

  if (!phone || !rawPassword) {
    return res.status(400).json({ success: false, message: 'Nomor HP dan password wajib diisi.' })
  }

  try {
    const result = await pool.query(
  `SELECT id, phone, password_hash, full_name, is_active, is_blocked FROM users WHERE phone = $1 LIMIT 1`,
  [phone]
)

    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Nomor HP atau password salah.' })
    }

    const user = result.rows[0]
    if (result.rows[0].is_blocked) {
  return res.status(403).json({ success: false, message: 'Akun Anda telah diblokir. Silakan hubungi admin.' });
}
    const validPassword = await bcrypt.compare(rawPassword, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Nomor HP atau password salah.' })
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d', issuer: 'DIGITALKU', audience: 'DIGITALKU-USER' }
    )

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        full_name: user.full_name,
        is_active: user.is_active,
      },
    })
  } catch (error) {
    handleError(res, error, 'Gagal login. Coba lagi.')
  }
})

// =====================================================
// 6. USER: PROFIL SAYA
// =====================================================

app.get('/api/users/me', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, phone, full_name, is_active, created_at
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [req.user.userId]
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Akun tidak aktif atau tidak ditemukan.' })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil profil.')
  }
})

// =====================================================
// 7. USER: CEK SALDO & POIN
// =====================================================

app.get('/api/users/balance', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query('SELECT balance, points FROM users WHERE id = $1', [req.user.userId])
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    res.json({ success: true, balance: result.rows[0].balance, points: result.rows[0].points })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil saldo.')
  }
})

// =====================================================
// 7B. USER: TUKAR POIN JADI SALDO
// =====================================================

app.post('/api/users/redeem-points', authenticateUser, async (req, res) => {
  const pointsToRedeem = Number(req.body.points)

  if (!Number.isSafeInteger(pointsToRedeem) || pointsToRedeem < 100 || pointsToRedeem % 100 !== 0) {
    return res.status(400).json({ success: false, message: 'Penukaran poin minimal 100 dan kelipatan 100.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }
    if (userResult.rows[0].points < pointsToRedeem) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Poin tidak mencukupi.' })
    }
    const balanceToAdd = (pointsToRedeem / 100) * 1000
    await client.query(
      'UPDATE users SET points = points - $1, balance = balance + $2 WHERE id = $3',
      [pointsToRedeem, balanceToAdd, req.user.userId]
    )
    await client.query('COMMIT')
    res.json({
      success: true,
      message: `Berhasil menukar ${pointsToRedeem} poin menjadi ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(balanceToAdd)} saldo.`,
      balance_added: balanceToAdd,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal menukar poin.')
  } finally {
    client.release()
  }
})

// =====================================================
// 7C. USER: AJUKAN TOP UP SALDO
// =====================================================

app.post('/api/users/topup', authenticateUser, userOrderLimiter, async (req, res) => {
  const amount = Number(req.body.amount)

  if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 5000000) {
    return res.status(400).json({ success: false, message: 'Nominal top up harus antara Rp10.000 - Rp5.000.000.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO topup_requests (user_id, amount, payment_status)
       VALUES ($1, $2, 'pending')
       RETURNING id, amount, payment_status, created_at`,
      [req.user.userId, amount]
    )
    res.status(201).json({
      success: true,
      message: 'Permintaan top up dibuat. Silakan scan QRIS untuk membayar.',
      topup: result.rows[0],
    })
  } catch (error) {
    handleError(res, error, 'Gagal membuat permintaan top up.')
  }
})

// =====================================================
// 7D. USER: AJUKAN WITHDRAW
// =====================================================

app.post('/api/users/withdraw', authenticateUser, userOrderLimiter, async (req, res) => {
  const amount = Number(req.body.amount)
  const bankName = String(req.body.bank_name || '').trim()
  const accountNumber = String(req.body.account_number || '').trim()
  const accountName = String(req.body.account_name || '').trim()

  if (!Number.isSafeInteger(amount) || amount < 10000) {
    return res.status(400).json({ success: false, message: 'Minimal withdraw adalah Rp 10.000.' })
  }
  if (!bankName || !accountNumber || !accountName) {
    return res.status(400).json({ success: false, message: 'Nama bank, nomor rekening, dan nama pemilik wajib diisi.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }
    const currentBalance = Number(userResult.rows[0].balance)
    if (currentBalance - amount < 10000) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: `Saldo tidak cukup. Anda harus menyisakan minimal Rp 10.000. Saldo Anda: Rp ${currentBalance.toLocaleString('id-ID')}.`,
      })
    }
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, req.user.userId])
    const result = await client.query(
      `INSERT INTO withdraw_requests (user_id, amount, bank_name, account_number, account_name, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id, amount, status, created_at`,
      [req.user.userId, amount, bankName, accountNumber, accountName]
    )
    await client.query('COMMIT')
    res.status(201).json({ success: true, message: 'Permintaan withdraw berhasil dibuat.', withdraw: result.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal mengajukan withdraw.')
  } finally {
    client.release()
  }
})

// =====================================================
// 7E. USER: CEK MISI (HANYA LEVEL 1 / PEMULA)
// =====================================================

app.get('/api/users/mission', authenticateUser, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT has_claimed_mission_bonus FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }
    const orderResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    const totalTransactions = orderResult.rows[0].total
    const hasClaimed = userResult.rows[0].has_claimed_mission_bonus

    res.json({
      success: true,
      total_transactions: totalTransactions,
      target_transactions: 15,
      has_claimed: hasClaimed,
      can_claim: totalTransactions >= 15 && !hasClaimed,
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data misi.')
  }
})

// =====================================================
// 7F. USER: KLAIM MISI (15 TRANSAKSI / Rp 20.000)
// =====================================================

app.post('/api/users/claim-mission', authenticateUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT has_claimed_mission_bonus FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rows[0].has_claimed_mission_bonus) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Anda sudah pernah mengambil bonus ini.' })
    }
    const orderResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    if (orderResult.rows[0].total < 15) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Transaksi Anda belum mencapai 15 kali.' })
    }
    await client.query(
      `UPDATE users
       SET balance = balance + 20000,
           has_claimed_mission_bonus = true,
           mission_level2_started_at = COALESCE(mission_level2_started_at, NOW())
       WHERE id = $1`,
      [req.user.userId]
    )
    await client.query('COMMIT')
    res.json({ success: true, message: 'Selamat! Bonus Rp 20.000 berhasil ditambahkan ke saldo Anda.' })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal mengambil bonus misi.')
  } finally {
    client.release()
  }
})

// =====================================================
// 7F2. USER: CEK MISI LEVEL 2 (50 TRANSAKSI / Rp 50.000)
// =====================================================

app.get('/api/users/mission-level2', authenticateUser, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT has_claimed_mission_bonus,
              has_claimed_mission_level2,
              mission_level2_started_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    )

    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }

    const user = userResult.rows[0]
    const prerequisiteMet = user.has_claimed_mission_bonus === true
    const startAt = user.mission_level2_started_at
    const hasClaimed = user.has_claimed_mission_level2

    let totalTransactions = 0
    if (prerequisiteMet && startAt) {
      const orderResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM orders
         WHERE user_id = $1
           AND order_status = 'completed'
           AND created_at >= $2`,
        [req.user.userId, startAt]
      )
      totalTransactions = orderResult.rows[0].total
    }

    res.json({
      success: true,
      prerequisite_met: prerequisiteMet,
      total_transactions: totalTransactions,
      target_transactions: 50,
      bonus_amount: 50000,
      has_claimed: hasClaimed,
      can_claim: prerequisiteMet && Boolean(startAt) && totalTransactions >= 50 && !hasClaimed,
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data misi level 2.')
  }
})

// =====================================================
// 7F3. USER: KLAIM MISI LEVEL 2 (50 TRANSAKSI / Rp 50.000)
// =====================================================

app.post('/api/users/claim-mission-level2', authenticateUser, async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const userResult = await client.query(
      `SELECT has_claimed_mission_bonus,
              has_claimed_mission_level2,
              mission_level2_started_at
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [req.user.userId]
    )

    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }

    const user = userResult.rows[0]

    if (!user.has_claimed_mission_bonus) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'Anda harus menyelesaikan dan mengklaim misi Level 1 terlebih dahulu.',
      })
    }

    if (user.has_claimed_mission_level2) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'Anda sudah pernah mengambil bonus misi level 2.',
      })
    }

    if (!user.mission_level2_started_at) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'Waktu mulai misi Level 2 belum tercatat. Hubungi admin.',
      })
    }

    const orderResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM orders
       WHERE user_id = $1
         AND order_status = 'completed'
         AND created_at >= $2`,
      [req.user.userId, user.mission_level2_started_at]
    )

    if (orderResult.rows[0].total < 50) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: 'Transaksi berhasil Anda belum mencapai 50 kali.',
      })
    }

    await client.query(
      `UPDATE users
       SET balance = balance + 50000,
           has_claimed_mission_level2 = TRUE
       WHERE id = $1`,
      [req.user.userId]
    )

    await client.query('COMMIT')

    res.json({
      success: true,
      message: 'Selamat! Bonus misi level 2 sebesar Rp 50.000 berhasil ditambahkan ke saldo Anda.',
    })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal mengambil bonus misi level 2.')
  } finally {
    client.release()
  }
})

// =====================================================
// 7G. SLOT MACHINE: SPIN
// =====================================================

app.post('/api/slot/spin', authenticateUser, slotLimiter, async (req, res) => {
  const bet = Number(req.body.bet)

  // validasi bet: integer, kelipatan step, dalam range
  if (
    !Number.isSafeInteger(bet) ||
    bet < SLOT_MIN_BET ||
    bet > SLOT_MAX_BET ||
    bet % SLOT_BET_STEP !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: `Bet harus kelipatan Rp${SLOT_BET_STEP}, minimal Rp${SLOT_MIN_BET.toLocaleString('id-ID')}, maksimal Rp${SLOT_MAX_BET.toLocaleString('id-ID')}.`,
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // lock user row, cek saldo
    const userResult = await client.query(
      'SELECT id, balance FROM users WHERE id = $1 AND is_active = TRUE FOR UPDATE',
      [req.user.userId]
    )
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(401).json({ success: false, message: 'Akun tidak aktif. Silakan login kembali.' })
    }

    const balanceBefore = Number(userResult.rows[0].balance)
    if (balanceBefore < bet) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        success: false,
        message: `Saldo tidak cukup. Saldo Anda: Rp ${balanceBefore.toLocaleString('id-ID')}.`,
      })
    }

    // potong bet
    await client.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [bet, req.user.userId]
    )

    // spin (RNG pakai crypto)
        // Cek apakah user sedang dalam mode "Paksa Menang"
      const userCheck = await client.query('SELECT force_win FROM users WHERE id = $1', [req.user.userId]);
      const isForceWin = userCheck.rows[0].force_win;

      let grid;
      if (isForceWin) {
        // PAKSA MENANG: Berikan 3 Simbol Naga di baris tengah
        const jackpotSymbol = SLOT_REELS[0][4]; // Indeks 4 adalah simbol Naga
        grid = [
          [SLOT_REELS[0][0], SLOT_REELS[0][1], SLOT_REELS[0][2], SLOT_REELS[0][3], SLOT_REELS[0][5]], 
          [jackpotSymbol, jackpotSymbol, jackpotSymbol, SLOT_REELS[0][1], SLOT_REELS[0][2]],             
          [SLOT_REELS[0][0], SLOT_REELS[0][1], SLOT_REELS[0][2], SLOT_REELS[0][3], SLOT_REELS[0][5]]
        ];
        
        // Matikan kembali status force_win setelah jackpot diberikan
        await client.query('UPDATE users SET force_win = FALSE WHERE id = $1', [req.user.userId]);
      } else {
        // Putaran Normal (Acak)
        const spinResult = spinSlotReels();
        grid = spinResult.grid;
      }
const { win, winningLines } = calculateSlotPayout(grid, bet);
const multiplier = win > 0 ? win / bet : 0;
const symbolsString = grid.map(row => row.join('')).join('|'); 
    // tambahkan kemenangan
    if (win > 0) {
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [win, req.user.userId]
      )
    }

    const balanceAfter = balanceBefore - bet + win
    const isBigWin = win >= SLOT_BIG_WIN_THRESHOLD

        // simpan riwayat (audit)
    const insertResult = await client.query(
      `INSERT INTO slot_spins
        (user_id, bet, symbols, grid_symbols, win_amount, multiplier, balance_before, balance_after, is_big_win, client_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [req.user.userId, bet, symbolsString, JSON.stringify(grid), win, multiplier, balanceBefore, balanceAfter, isBigWin, req.ip]
    )
    await client.query('COMMIT')

        res.json({
      success: true,
      spin: {
        id: insertResult.rows[0].id,
        grid: grid, // <-- Kirim data grid ke frontend
        bet,
        win,
        multiplier,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        is_big_win: isBigWin,
        created_at: insertResult.rows[0].created_at,
      },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal memproses spin.')
  } finally {
    client.release()
  }
})

// =====================================================
// 7H. SLOT MACHINE: RIWAYAT SPIN USER
// =====================================================

app.get('/api/slot/history', authenticateUser, async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))

  try {
    const result = await pool.query(
      `SELECT id, bet, symbols, win_amount, multiplier, balance_after, is_big_win, created_at
       FROM slot_spins WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [req.user.userId, limit]
    )
    res.json({ success: true, history: result.rows })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil riwayat spin.')
  }
})

// =====================================================
// 7I. SLOT MACHINE: PAYTABLE (info publik untuk frontend)
// =====================================================

app.get('/api/slot/paytable', (req, res) => {
  res.json({
    success: true,
    config: {
      reels: 3,
      symbols_per_reel: 12,
      min_bet: SLOT_MIN_BET,
      max_bet: SLOT_MAX_BET,
      bet_step: SLOT_BET_STEP,
      theoretical_rtp_percent: 91.0,
      theoretical_house_edge_percent: 9.0,
    },
    paytable: Object.entries(SLOT_PAYTABLE).map(([combo, mult]) => ({
      combo: combo.match(/./gu),
      multiplier: mult,
      label: `${mult}x bet`,
    })),
    two_cherry: {
      description: 'Reel 1 & 2 menunjukkan 🍒, reel 3 bebas',
      multiplier: SLOT_TWO_CHERRY_MULT,
    },
    symbols: ['🍒', '🍋', '🍊', '🔔', '⭐', '💎'],
  })
})
// =====================================================
// 8. USER: RIWAYAT PESANAN SAYA
// =====================================================

app.get('/api/users/orders', authenticateUser, userOrderLimiter, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1', [req.user.userId])
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.tracking_token, o.variant_name_snapshot, o.destination_number,
         o.amount, o.service_fee, o.total_amount, o.order_status, o.created_at, o.updated_at,
         p.name AS product_name, p.code AS product_code,
         pay.payment_method, pay.payment_status, pay.expected_amount, pay.received_amount, pay.verified_at
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN payments pay ON pay.order_id = o.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    )
    res.json({
      success: true,
      orders: result.rows,
      pagination: { page, limit, total: countResult.rows[0].total, total_pages: Math.ceil(countResult.rows[0].total / limit) },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil riwayat pesanan.')
  }
})

// =====================================================
// 9. MEMBUAT PESANAN PELANGGAN
// =====================================================

app.post('/api/orders', authenticateUser, orderLimiter, async (req, res) => {
  const { product_id, variant_id, destination_number, amount, payment_method } = req.body

  if (!isUUID(product_id)) {
    return res.status(400).json({ success: false, message: 'Produk tidak valid.' })
  }
  if (variant_id && !isUUID(variant_id)) {
    return res.status(400).json({ success: false, message: 'Varian produk tidak valid.' })
  }
  const rawDestination = String(destination_number || '').trim()
  let normalizedDestination = normalizeDestination(destination_number)
  if (!normalizedDestination || normalizedDestination.length > 200) {
    return res.status(400).json({ success: false, message: 'Nomor atau ID tujuan tidak valid.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query(
      `SELECT id, phone, full_name, balance FROM users WHERE id = $1 AND is_active = TRUE FOR SHARE`,
      [req.user.userId]
    )
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(401).json({ success: false, message: 'Akun tidak aktif. Silakan login kembali.' })
    }
    const user = userResult.rows[0]

    const productResult = await client.query(
      `SELECT id, name, code FROM products WHERE id = $1 AND is_active = TRUE FOR SHARE`,
      [product_id]
    )
    if (productResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan atau sedang tidak aktif.' })
    }
    const product = productResult.rows[0]
    const isBankTransferProduct = String(product.code || '').toUpperCase() === 'BANKTRANSFER'
          if (isBankTransferProduct) {
        // Cukup pastikan data bank, rekening, dan nama tidak kosong
        normalizedDestination = rawDestination.trim();
        if (!normalizedDestination || normalizedDestination.length < 10) {
          await client.query('ROLLBACK')
          return res.status(400).json({ success: false, message: 'Detail bank tujuan tidak valid. Periksa pilihan bank, nomor rekening, dan nama penerima.' })
        }
      }

    let finalAmount, variantSnapshot = null, variantCodeSnapshot = null, costPriceSnapshot = 0, selectedVariantId = null

    if (variant_id) {
      const variantResult = await client.query(
        `SELECT id, variant_name, code, cost_price, selling_price FROM product_variants
         WHERE id = $1 AND product_id = $2 AND is_active = TRUE FOR SHARE`,
        [variant_id, product_id]
      )
      if (variantResult.rowCount === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ success: false, message: 'Varian tidak ditemukan atau sedang tidak aktif.' })
      }
      const variant = variantResult.rows[0]
      finalAmount = Number(variant.selling_price)
      variantSnapshot = variant.variant_name
      variantCodeSnapshot = variant.code
      costPriceSnapshot = Number(variant.cost_price)
      selectedVariantId = variant.id
    } else {
      const variantsResult = await client.query(
        'SELECT id FROM product_variants WHERE product_id = $1 AND is_active = TRUE LIMIT 1',
        [product_id]
      )
      if (variantsResult.rowCount > 0 && !isBankTransferProduct) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, message: 'Silakan pilih varian produk terlebih dahulu.' })
      }
      if (!isPositiveInteger(amount) || Number(amount) < 10000 || Number(amount) > 1000000 || Number(amount) % 1000 !== 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, message: 'Nominal pesanan tidak valid.' })
      }
      finalAmount = Number(amount)
    }

    const orderServiceFee = isBankTransferProduct ? BANK_TRANSFER_SERVICE_FEE : SERVICE_FEE
    const totalAmount = finalAmount + orderServiceFee
    if (isBankTransferProduct && payment_method !== 'saldo') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Transfer All Bank wajib dibayar menggunakan saldo LukingzzStore.' })
    }
    let isPaidWithBalance = false

    if (payment_method === 'saldo') {
      if (Number(user.balance) < totalAmount) {
        await client.query('ROLLBACK')
        return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi. Silakan top up terlebih dahulu.' })
      }
      await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [totalAmount, user.id])
      isPaidWithBalance = true
    }

    const orderNumber = 'DK' + Date.now().toString() + crypto.randomBytes(3).toString('hex').toUpperCase()
    const orderResult = await client.query(
      `INSERT INTO orders (order_number, user_id, product_id, variant_id, variant_name_snapshot, variant_code_snapshot,
         cost_price_snapshot, customer_name, customer_phone, destination_number, amount, service_fee, total_amount, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
       RETURNING id, order_number, tracking_token, amount, service_fee, total_amount, order_status, created_at`,
      [orderNumber, user.id, product_id, selectedVariantId, variantSnapshot, variantCodeSnapshot, costPriceSnapshot,
       user.full_name || null, user.phone, normalizedDestination, finalAmount, orderServiceFee, totalAmount]
    )
    const order = orderResult.rows[0]

    await client.query(
      `INSERT INTO payments (order_id, payment_method, expected_amount, payment_status)
       VALUES ($1, $2, $3, $4)`,
      [order.id, isPaidWithBalance ? 'Saldo' : 'QRIS', totalAmount, isPaidWithBalance ? 'verified' : 'pending']
    )

    if (isPaidWithBalance) {
      await client.query(`UPDATE orders SET order_status = 'paid' WHERE id = $1`, [order.id])
         // Pemberian poin super untung: 1 poin per Rp 5.000 belanja
   const earnedPoints = Math.max(1, Math.floor(totalAmount / 5000));
      await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [earnedPoints, user.id])
    }
    // --- LOGIKA BONUS REFERRAL ---
    // Cek apakah user ini punya pengundang (referred_by) dan belum pernah dapat bonus
    const userRefResult = await client.query('SELECT referred_by FROM users WHERE id = $1', [req.user.userId]);
    const referredByCode = userRefResult.rows[0].referred_by;

    if (referredByCode && isPaidWithBalance) { // Asumsi isPaidWithBalance true jika bayar pakai saldo
      // Cek apakah user ini sudah pernah dapat bonus
      const bonusCheck = await client.query('SELECT id FROM referral_bonuses WHERE referred_id = $1', [req.user.userId]);
      
      if (bonusCheck.rowCount === 0) {
        // Cari ID pengundang berdasarkan kode referral
        const referrerResult = await client.query('SELECT id FROM users WHERE phone = $1 OR id::text = $2', [referredByCode, referredByCode]);
        
        if (referrerResult.rowCount > 0) {
          const referrerId = referrerResult.rows[0].id;
          const bonusAmount = 2000;

          // 1. Beri bonus ke Pengundang
          await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [bonusAmount, referrerId]);
          
          // 2. Beri bonus ke Pengguna Baru (yang bertransaksi)
          await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [bonusAmount, req.user.userId]);
          
          // 3. Catat di tabel referral_bonuses agar tidak dobel
          await client.query(
            'INSERT INTO referral_bonuses (referrer_id, referred_id, bonus_amount) VALUES ($1, $2, $3)',
            [referrerId, req.user.userId, bonusAmount]
          );
        }
      }
    }
    // --- AKHIR LOGIKA BONUS REFERRAL ---

    await client.query('COMMIT')
    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat.',
      order: { ...order, product: product.name, product_name: product.name, variant_name: variantSnapshot, customer_phone: user.phone, customer_name: user.full_name || null, destination_number: normalizedDestination, payment_method: isPaidWithBalance ? 'Saldo' : 'QRIS', payment_status: isPaidWithBalance ? 'verified' : 'pending' },
    })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal membuat pesanan.')
  } finally {
    client.release()
  }
})

// =====================================================
// 10. ADMIN: SETUP
// =====================================================

app.post('/api/admin/setup', setupLimiter, async (req, res) => {
  if (!validSetupKey(req)) {
    return res.status(403).json({ success: false, message: 'Kunci setup admin tidak valid.' })
  }
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!/^[a-zA-Z0-9_]{4,30}$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Username harus 4–30 karakter.' })
  }
  if (password.length < 12 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password minimal 12 karakter.' })
  }

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM admins')
    if (countResult.rows[0].total > 0) {
      return res.status(403).json({ success: false, message: 'Admin sudah terdaftar. Setup pertama sudah ditutup.' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO admins (username, password_hash, is_active) VALUES ($1, $2, TRUE) RETURNING id, username, created_at`,
      [username, passwordHash]
    )
    res.status(201).json({ success: true, message: 'Admin pertama berhasil dibuat.', admin: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal membuat admin.')
  }
})

// =====================================================
// 11. LOGIN ADMIN
// =====================================================

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim()
  const password = String(req.body.password || '')

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' })
  }

  try {
    const result = await pool.query(
      `SELECT id, username, password_hash, is_active FROM admins WHERE username = $1 LIMIT 1`,
      [username]
    )
    if (result.rowCount === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' })
    }
    const admin = result.rows[0]
    const validPassword = await bcrypt.compare(password, admin.password_hash)
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Username atau password salah.' })
    }
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '8h', issuer: 'DIGITALKU', audience: 'DIGITALKU-ADMIN' }
    )
    res.json({ success: true, message: 'Login berhasil.', token, admin: { id: admin.id, username: admin.username } })
  } catch (error) {
    handleError(res, error, 'Gagal melakukan login.')
  }
})

// =====================================================
// 12. INFORMASI ADMIN YANG SEDANG LOGIN
// =====================================================

app.get('/api/admin/me', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, is_active FROM admins WHERE id = $1 AND is_active = TRUE`,
      [req.admin.adminId]
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Admin tidak aktif atau tidak ditemukan.' })
    }
    res.json({ success: true, admin: result.rows[0] })
  } catch (error) {
    handleError(res, error)
  }
})

// =====================================================
// 13. ADMIN: DAFTAR USERS
// =====================================================
// =====================================================
// ADMIN: BERI JACKPOT KE USER
// =====================================================
// =====================================================
// ADMIN: BLOKIR / BUKA BLOKIR USER
// =====================================================
app.post('/api/admin/users/:userId/toggle-block', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const userResult = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    
    const newStatus = !userResult.rows[0].is_blocked;
    await pool.query('UPDATE users SET is_blocked = $1 WHERE id = $2', [newStatus, userId]);
    
    res.json({ success: true, message: newStatus ? 'Akun berhasil diblokir.' : 'Blokir akun berhasil dibuka.', is_blocked: newStatus });
  } catch (error) {
    handleError(res, error, 'Gagal memproses blokir akun.');
  }
});
app.post('/api/admin/users/:userId/force-win', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    await pool.query('UPDATE users SET force_win = TRUE WHERE id = $1', [userId]);
    res.json({ success: true, message: 'Status jackpot diberikan. User akan menang di spin berikutnya.' });
  } catch (error) {
    handleError(res, error, 'Gagal memberikan jackpot.');
  }
});
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM users')
    const result = await pool.query(
      `SELECT id, phone, full_name, balance::float AS balance, points::float AS points, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    res.json({
      success: true,
      users: result.rows,
      pagination: { page, limit, total: countResult.rows[0].total, total_pages: Math.ceil(countResult.rows[0].total / limit) },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar user.')
  }
})
// =====================================================
// ADMIN: BLOKIR / BUKA BLOKIR USER
// =====================================================
app.post('/api/admin/users/:userId/toggle-block', authenticateAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    // Ambil status blokir saat ini
    const userResult = await pool.query('SELECT is_blocked FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

    const currentStatus = userResult.rows[0].is_blocked;
    const newStatus = !currentStatus; // Jika true jadi false, jika false jadi true

    await pool.query('UPDATE users SET is_blocked = $1 WHERE id = $2', [newStatus, userId]);

    res.json({ 
      success: true, 
      message: newStatus ? 'Akun berhasil diblokir.' : 'Blokir akun berhasil dibuka.',
      is_blocked: newStatus 
    });
  } catch (error) {
    handleError(res, error, 'Gagal memproses blokir akun.');
  }
});
// =====================================================
// 14. ADMIN: RESET PASSWORD USER
// =====================================================

app.put('/api/admin/users/:userId/reset-password', authenticateAdmin, async (req, res) => {
  const { userId } = req.params
  if (!isUUID(userId)) {
    return res.status(400).json({ success: false, message: 'ID user tidak valid.' })
  }
  const newPassword = String(req.body.new_password || '')
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ success: false, message: 'Password baru harus 8–128 karakter.' })
  }
  try {
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, phone, full_name`,
      [passwordHash, userId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })
    }
    res.json({ success: true, message: 'Password user berhasil direset.', user: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal mereset password.')
  }
})

// =====================================================
// 15. ADMIN: DAFTAR PRODUK
// =====================================================

app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.name, p.code, p.description, p.is_active, p.created_at, p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id, 'variant_name', v.variant_name, 'code', v.code, 'description', v.description,
              'cost_price', v.cost_price, 'selling_price', v.selling_price, 'is_active', v.is_active,
              'created_at', v.created_at, 'updated_at', v.updated_at
            ) ORDER BY v.created_at DESC
          ) FILTER (WHERE v.id IS NOT NULL), '[]'::json
        ) AS variants
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      GROUP BY p.id ORDER BY p.name ASC
    `)
    res.json({ success: true, products: result.rows })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil produk admin.')
  }
})

// =====================================================
// 16. ADMIN: TAMBAH PRODUK
// =====================================================

app.post('/api/admin/products', authenticateAdmin, productLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim()
  const code = String(req.body.code || '').trim().toUpperCase()
  const description = String(req.body.description || '').trim()

  if (!name || name.length > 150) {
    return res.status(400).json({ success: false, message: 'Nama produk wajib diisi maksimal 150 karakter.' })
  }
  if (!/^[A-Z0-9_-]{2,100}$/.test(code)) {
    return res.status(400).json({ success: false, message: 'Kode produk tidak valid.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name, code, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING *`,
      [name, code, description || null]
    )
    res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan.', product: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal menambahkan produk.')
  }
})

// =====================================================
// 17. ADMIN: EDIT PRODUK
// =====================================================

app.put('/api/admin/products/:productId', authenticateAdmin, productLimiter, async (req, res) => {
  const { productId } = req.params
  if (!isUUID(productId)) {
    return res.status(400).json({ success: false, message: 'ID produk tidak valid.' })
  }
  const name = String(req.body.name || '').trim()
  const code = String(req.body.code || '').trim().toUpperCase()
  const description = String(req.body.description || '').trim()
  const isActive = req.body.is_active

  if (!name || name.length > 150) {
    return res.status(400).json({ success: false, message: 'Nama produk wajib diisi.' })
  }
  if (!/^[A-Z0-9_-]{2,100}$/.test(code)) {
    return res.status(400).json({ success: false, message: 'Kode produk tidak valid.' })
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Status aktif produk tidak valid.' })
  }

  try {
    const result = await pool.query(
      `UPDATE products SET name = $1, code = $2, description = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, code, description || null, isActive, productId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' })
    }
    res.json({ success: true, message: 'Produk berhasil diperbarui.', product: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal memperbarui produk.')
  }
})

// =====================================================
// 18. ADMIN: TAMBAH VARIAN
// =====================================================

app.post('/api/admin/variants', authenticateAdmin, productLimiter, async (req, res) => {
  const { product_id, variant_name, code, description, cost_price, selling_price } = req.body
  const name = String(variant_name || '').trim()
  const variantCode = String(code || '').trim().toUpperCase()

  if (!isUUID(product_id)) {
    return res.status(400).json({ success: false, message: 'Produk tidak valid.' })
  }
  if (!name || name.length > 150) {
    return res.status(400).json({ success: false, message: 'Nama varian wajib diisi.' })
  }
  if (!/^[A-Z0-9_-]{1,100}$/.test(variantCode)) {
    return res.status(400).json({ success: false, message: 'Kode varian tidak valid.' })
  }
  if (!isNonNegativeInteger(cost_price)) {
    return res.status(400).json({ success: false, message: 'Harga modal tidak valid.' })
  }
  if (!isPositiveInteger(selling_price)) {
    return res.status(400).json({ success: false, message: 'Harga jual tidak valid.' })
  }

  try {
    const product = await pool.query('SELECT id FROM products WHERE id = $1', [product_id])
    if (product.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' })
    }
    const result = await pool.query(
      `INSERT INTO product_variants (product_id, variant_name, code, description, cost_price, selling_price, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
      [product_id, name, variantCode, String(description || '').trim() || null, Number(cost_price), Number(selling_price)]
    )
    res.status(201).json({ success: true, message: 'Varian produk berhasil ditambahkan.', variant: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal menambahkan varian.')
  }
})

// =====================================================
// 19. ADMIN: EDIT VARIAN
// =====================================================

app.put('/api/admin/variants/:variantId', authenticateAdmin, productLimiter, async (req, res) => {
  const { variantId } = req.params
  if (!isUUID(variantId)) {
    return res.status(400).json({ success: false, message: 'ID varian tidak valid.' })
  }
  const { variant_name, code, description, cost_price, selling_price, is_active } = req.body
  const name = String(variant_name || '').trim()
  const variantCode = String(code || '').trim().toUpperCase()

  if (!name || name.length > 150) {
    return res.status(400).json({ success: false, message: 'Nama varian wajib diisi.' })
  }
  if (!/^[A-Z0-9_-]{1,100}$/.test(variantCode)) {
    return res.status(400).json({ success: false, message: 'Kode varian tidak valid.' })
  }
  if (!isNonNegativeInteger(cost_price)) {
    return res.status(400).json({ success: false, message: 'Harga modal tidak valid.' })
  }
  if (!isPositiveInteger(selling_price)) {
    return res.status(400).json({ success: false, message: 'Harga jual tidak valid.' })
  }
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Status aktif varian tidak valid.' })
  }

  try {
    const result = await pool.query(
      `UPDATE product_variants SET variant_name = $1, code = $2, description = $3, cost_price = $4,
         selling_price = $5, is_active = $6, updated_at = NOW() WHERE id = $7 RETURNING *`,
      [name, variantCode, String(description || '').trim() || null, Number(cost_price), Number(selling_price), is_active, variantId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Varian tidak ditemukan.' })
    }
    res.json({ success: true, message: 'Varian berhasil diperbarui.', variant: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal memperbarui varian.')
  }
})

// =====================================================
// 20. ADMIN: VERIFIKASI PEMBAYARAN
// =====================================================

app.post('/api/admin/payments/:orderId/verify', authenticateAdmin, paymentVerifyLimiter, async (req, res) => {
  const { orderId } = req.params
  if (!isUUID(orderId)) {
    return res.status(400).json({ success: false, message: 'ID pesanan tidak valid.' })
  }

  const receivedAmount = req.body.received_amount === undefined ? null : Number(req.body.received_amount)
  const transactionReference = String(req.body.transaction_reference || '').trim() || null

  if (receivedAmount !== null && !isPositiveInteger(receivedAmount)) {
    return res.status(400).json({ success: false, message: 'Jumlah pembayaran tidak valid.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const adminResult = await client.query('SELECT id FROM admins WHERE id = $1 AND is_active = TRUE FOR SHARE', [req.admin.adminId])
    if (adminResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(401).json({ success: false, message: 'Admin tidak aktif.' })
    }
    const orderResult = await client.query('SELECT id, order_number, total_amount, order_status FROM orders WHERE id = $1 FOR UPDATE', [orderId])
    if (orderResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' })
    }
    const order = orderResult.rows[0]
    const paymentResult = await client.query('SELECT id, expected_amount, payment_status FROM payments WHERE order_id = $1 FOR UPDATE', [orderId])
    if (paymentResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Data pembayaran tidak ditemukan.' })
    }
    const payment = paymentResult.rows[0]
    if (payment.payment_status === 'verified') {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'Pembayaran sudah diverifikasi sebelumnya.' })
    }
    const finalReceivedAmount = receivedAmount === null ? Number(payment.expected_amount) : receivedAmount
    if (finalReceivedAmount !== Number(payment.expected_amount) || finalReceivedAmount !== Number(order.total_amount)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Jumlah pembayaran tidak sesuai dengan total pesanan.' })
    }
    await client.query(
      `UPDATE payments SET received_amount = $1, payment_status = 'verified', verified_at = NOW(),
         verified_by = $2, transaction_reference = $3, updated_at = NOW() WHERE order_id = $4`,
      [finalReceivedAmount, req.admin.adminId, transactionReference, orderId]
    )
    if (order.order_status === 'pending') {
      await client.query(`UPDATE orders SET order_status = 'paid', updated_at = NOW() WHERE id = $1`, [orderId])
    }
    await logActivity(client, req.admin.adminId, 'verify_payment', 'order', orderId, `Pembayaran pesanan ${order.order_number} diverifikasi.`, req.ip)
    await client.query('COMMIT')
    res.json({ success: true, message: 'Pembayaran berhasil diverifikasi.' })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal memverifikasi pembayaran.')
  } finally {
    client.release()
  }
})

// =====================================================
// 21. ADMIN: VERIFIKASI TOP UP
// =====================================================

app.get('/api/admin/topups', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.payment_status, t.created_at, u.phone, u.full_name
       FROM topup_requests t JOIN users u ON u.id = t.user_id
       WHERE t.payment_status = 'pending' ORDER BY t.created_at ASC`
    )
    res.json({ success: true, topups: result.rows })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar top up.')
  }
})

app.post('/api/admin/topups/:id/verify', authenticateAdmin, async (req, res) => {
  const { id } = req.params
  if (!isUUID(id)) return res.status(400).json({ success: false, message: 'ID tidak valid.' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const topupResult = await client.query('SELECT user_id, amount, payment_status FROM topup_requests WHERE id = $1 FOR UPDATE', [id])
    if (topupResult.rowCount === 0 || topupResult.rows[0].payment_status !== 'pending') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Top up tidak ditemukan atau sudah diproses.' })
    }
    const topup = topupResult.rows[0]
    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [Number(topup.amount), topup.user_id])
    await client.query(`UPDATE topup_requests SET payment_status = 'verified', updated_at = NOW() WHERE id = $1`, [id])
    await client.query('COMMIT')
    res.json({ success: true, message: 'Top Up berhasil diverifikasi. Saldo user telah ditambahkan.' })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal memverifikasi top up.')
  } finally {
    client.release()
  }
})

// =====================================================
// 21C. ADMIN: VERIFIKASI WITHDRAW
// =====================================================

app.get('/api/admin/withdraws', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.amount, w.bank_name, w.account_number, w.account_name, w.status, w.created_at, u.phone, u.full_name
       FROM withdraw_requests w JOIN users u ON u.id = w.user_id
       WHERE w.status = 'pending' ORDER BY w.created_at ASC`
    )
    res.json({ success: true, withdraws: result.rows })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar withdraw.')
  }
})

app.post('/api/admin/withdraws/:id/verify', authenticateAdmin, async (req, res) => {
  const { id } = req.params
  if (!isUUID(id)) return res.status(400).json({ success: false, message: 'ID tidak valid.' })

  const action = String(req.body.action || '').trim()
  const adminNotes = String(req.body.admin_notes || '').trim()

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Aksi tidak valid.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const withdrawResult = await client.query('SELECT user_id, amount, status FROM withdraw_requests WHERE id = $1 FOR UPDATE', [id])
    if (withdrawResult.rowCount === 0 || withdrawResult.rows[0].status !== 'pending') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Withdraw tidak ditemukan atau sudah diproses.' })
    }
    const withdraw = withdrawResult.rows[0]

    if (action === 'approve') {
      await client.query(
        `UPDATE withdraw_requests SET status = 'verified', admin_notes = $1, updated_at = NOW() WHERE id = $2`,
        [adminNotes || 'Sudah ditransfer.', id]
      )
      await client.query('COMMIT')
      res.json({ success: true, message: `Withdraw Rp ${Number(withdraw.amount).toLocaleString('id-ID')} berhasil diverifikasi.` })
    } else {
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [Number(withdraw.amount), withdraw.user_id])
      await client.query(
        `UPDATE withdraw_requests SET status = 'rejected', admin_notes = $1, updated_at = NOW() WHERE id = $2`,
        [adminNotes || 'Ditolak.', id]
      )
      await client.query('COMMIT')
      res.json({ success: true, message: 'Withdraw ditolak, saldo dikembalikan.' })
    }
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal memproses withdraw.')
  } finally {
    client.release()
  }
})

// =====================================================
// 22. ADMIN: PERUBAHAN STATUS PESANAN
// =====================================================

app.put('/api/admin/orders/:orderId/status', authenticateAdmin, orderStatusLimiter, async (req, res) => {
  const { orderId } = req.params
  const newStatus = String(req.body.status || '').trim()

  if (!isUUID(orderId)) {
    return res.status(400).json({ success: false, message: 'ID pesanan tidak valid.' })
  }
  if (!['processing', 'completed', 'failed'].includes(newStatus)) {
    return res.status(400).json({ success: false, message: 'Status pesanan tidak valid.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const orderResult = await client.query(`SELECT o.id, o.order_number, o.order_status, o.user_id, o.total_amount, p.code AS product_code, pay.payment_method FROM orders o JOIN products p ON p.id = o.product_id JOIN payments pay ON pay.order_id = o.id WHERE o.id = $1 FOR UPDATE OF o`, [orderId])
    if (orderResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' })
    }
    const order = orderResult.rows[0]
    const paymentResult = await client.query('SELECT payment_status FROM payments WHERE order_id = $1 FOR UPDATE', [orderId])
    if (paymentResult.rowCount === 0 || paymentResult.rows[0].payment_status !== 'verified') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Pembayaran harus diverifikasi sebelum pesanan diproses.' })
    }
    const allowedTransitions = { paid: ['processing'], processing: ['completed', 'failed'] }
    const allowed = allowedTransitions[order.order_status] || []
    if (!allowed.includes(newStatus)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: `Perubahan status dari ${order.order_status} ke ${newStatus} tidak diizinkan.` })
    }
    await client.query('UPDATE orders SET order_status = $1, updated_at = NOW() WHERE id = $2', [newStatus, orderId])
    if (newStatus === 'failed' && String(order.product_code || '').toUpperCase() === 'BANKTRANSFER' && String(order.payment_method || '').toLowerCase() === 'saldo') {
      await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [Number(order.total_amount), order.user_id])
      await logActivity(client, req.admin.adminId, 'refund_bank_transfer_balance', 'order', orderId, `Saldo Rp${Number(order.total_amount).toLocaleString('id-ID')} dikembalikan untuk pesanan transfer bank ${order.order_number}.`, req.ip)
    }
    if (newStatus === 'processing') {
      await client.query(
        `INSERT INTO order_processing (order_id, admin_id, processing_status) VALUES ($1, $2, 'waiting')
         ON CONFLICT (order_id) DO UPDATE SET admin_id = EXCLUDED.admin_id, updated_at = NOW()`,
        [orderId, req.admin.adminId]
      )
    }
    await logActivity(client, req.admin.adminId, 'update_order_status', 'order', orderId, `Status pesanan ${order.order_number} diubah menjadi ${newStatus}.`, req.ip)
    await client.query('COMMIT')
    res.json({ success: true, message: 'Status pesanan berhasil diperbarui.', status: newStatus })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal memperbarui status pesanan.')
  } finally {
    client.release()
  }
})

// =====================================================
// 23. ADMIN: CATATAN DAN PROSES MANUAL
// =====================================================

app.put('/api/admin/orders/:orderId/processing', authenticateAdmin, orderStatusLimiter, async (req, res) => {
  const { orderId } = req.params
  if (!isUUID(orderId)) {
    return res.status(400).json({ success: false, message: 'ID pesanan tidak valid.' })
  }
  const processingStatus = String(req.body.processing_status || '').trim()
  if (!['waiting', 'processing', 'success', 'failed'].includes(processingStatus)) {
    return res.status(400).json({ success: false, message: 'Status proses tidak valid.' })
  }
  const supplierName = String(req.body.supplier_name || '').trim() || null
  const supplierTransactionId = String(req.body.supplier_transaction_id || '').trim() || null
  const adminNotes = String(req.body.admin_notes || '').trim() || null
  const purchaseAmount = req.body.purchase_amount === '' || req.body.purchase_amount === undefined || req.body.purchase_amount === null ? null : Number(req.body.purchase_amount)

  if (purchaseAmount !== null && !isNonNegativeInteger(purchaseAmount)) {
    return res.status(400).json({ success: false, message: 'Harga pembelian harus berupa angka minimal Rp0.' })
  }
  if (
    (supplierName && supplierName.length > 150) ||
    (supplierTransactionId && supplierTransactionId.length > 150) ||
    (adminNotes && adminNotes.length > 2000)
  ) {
    return res.status(400).json({ success: false, message: 'Catatan atau informasi supplier terlalu panjang.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const orderResult = await client.query(`SELECT o.id, o.order_number, o.order_status, o.user_id, o.total_amount, p.code AS product_code, pay.payment_method FROM orders o JOIN products p ON p.id = o.product_id JOIN payments pay ON pay.order_id = o.id WHERE o.id = $1 FOR UPDATE OF o`, [orderId])
    if (orderResult.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' })
    }
    const order = orderResult.rows[0]
    if (!['processing', 'completed', 'failed'].includes(order.order_status)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Pesanan harus masuk tahap pemrosesan terlebih dahulu.' })
    }
    const paymentResult = await client.query('SELECT payment_status FROM payments WHERE order_id = $1 FOR UPDATE', [orderId])
    if (paymentResult.rowCount === 0 || paymentResult.rows[0].payment_status !== 'verified') {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'Pembayaran belum diverifikasi.' })
    }
    await client.query(
      `INSERT INTO order_processing (order_id, admin_id, supplier_name, supplier_transaction_id, processing_status, purchase_amount, admin_notes, processed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $5 IN ('success', 'failed') THEN NOW() ELSE NULL END)
       ON CONFLICT (order_id) DO UPDATE SET
         admin_id = EXCLUDED.admin_id, supplier_name = EXCLUDED.supplier_name,
         supplier_transaction_id = EXCLUDED.supplier_transaction_id, processing_status = EXCLUDED.processing_status,
         purchase_amount = EXCLUDED.purchase_amount, admin_notes = EXCLUDED.admin_notes,
         processed_at = CASE WHEN EXCLUDED.processing_status IN ('success', 'failed') THEN NOW() ELSE NULL END,
         updated_at = NOW()`,
      [orderId, req.admin.adminId, supplierName, supplierTransactionId, processingStatus, purchaseAmount, adminNotes]
    )
    if (processingStatus === 'success' && order.order_status === 'processing') {
      await client.query(`UPDATE orders SET order_status = 'completed', updated_at = NOW() WHERE id = $1`, [orderId])
    }
    if (processingStatus === 'failed' && order.order_status === 'processing') {
      await client.query(`UPDATE orders SET order_status = 'failed', updated_at = NOW() WHERE id = $1`, [orderId])
      if (String(order.product_code || '').toUpperCase() === 'BANKTRANSFER' && String(order.payment_method || '').toLowerCase() === 'saldo') {
        await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [Number(order.total_amount), order.user_id])
        await logActivity(client, req.admin.adminId, 'refund_bank_transfer_balance', 'order', orderId, `Saldo Rp${Number(order.total_amount).toLocaleString('id-ID')} dikembalikan untuk pesanan transfer bank ${order.order_number}.`, req.ip)
      }
    }
    await logActivity(client, req.admin.adminId, 'update_order_processing', 'order', orderId, `Proses pesanan ${order.order_number} diperbarui menjadi ${processingStatus}.`, req.ip)
    await client.query('COMMIT')
    res.json({ success: true, message: 'Informasi pemrosesan pesanan berhasil disimpan.', processing_status: processingStatus })
  } catch (error) {
    await client.query('ROLLBACK')
    handleError(res, error, 'Gagal menyimpan proses pesanan.')
  } finally {
    client.release()
  }
})

// =====================================================
// 24. ADMIN: DAFTAR PESANAN
// =====================================================

app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit

  try {
    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM orders')
    const result = await pool.query(
      `SELECT o.id, o.order_number, o.tracking_token, o.user_id, o.product_id, o.variant_id,
         o.variant_name_snapshot, o.variant_code_snapshot, o.cost_price_snapshot,
         o.customer_name, o.customer_phone, o.destination_number, o.amount, o.service_fee,
         o.total_amount, o.order_status, o.created_at, o.updated_at,
         p.name AS product_name, p.code AS product_code, u.phone AS user_phone,
         pay.payment_method, pay.expected_amount, pay.received_amount, pay.payment_status, pay.verified_at,
         op.supplier_name, op.supplier_transaction_id, op.processing_status, op.purchase_amount, op.admin_notes, op.processed_at
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN payments pay ON pay.order_id = o.id
       LEFT JOIN order_processing op ON op.order_id = o.id
       ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    res.json({
      success: true,
      orders: result.rows,
      pagination: { page, limit, total: countResult.rows[0].total, total_pages: Math.ceil(countResult.rows[0].total / limit) },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar pesanan.')
  }
})

// =====================================================
// 25. PELACAKAN PESANAN
// =====================================================

app.get('/api/orders/:orderNumber/track/:trackingToken', trackingLimiter, async (req, res) => {
  const { orderNumber, trackingToken } = req.params
  if (!isUUID(trackingToken)) {
    return res.status(400).json({ success: false, message: 'Token pelacakan tidak valid.' })
  }
  try {
    const result = await pool.query(
      `SELECT o.order_number, o.customer_name, o.customer_phone, o.destination_number,
         o.amount, o.service_fee, o.total_amount, o.order_status, o.variant_name_snapshot,
         o.created_at, o.updated_at, p.name AS product_name, p.code AS product_code,
         pay.payment_method, pay.payment_status,
         op.processing_status, op.supplier_name, op.admin_notes, op.processed_at
       FROM orders o
       LEFT JOIN products p ON p.id = o.product_id
       LEFT JOIN payments pay ON pay.order_id = o.id
       LEFT JOIN order_processing op ON op.order_id = o.id
       WHERE o.order_number = $1 AND o.tracking_token = $2 LIMIT 1`,
      [orderNumber, trackingToken]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' })
    }
    res.json({ success: true, order: result.rows[0] })
  } catch (error) {
    handleError(res, error, 'Gagal melacak pesanan.')
  }
})
// =====================================================
// 26. ADMIN: DAFTAR SPIN SLOT (AUDIT)
// =====================================================

app.get('/api/admin/slot/spins', authenticateAdmin, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  const offset = (page - 1) * limit
  const userId = req.query.user_id

  try {
    const params = []
    let whereClause = ''

    if (userId) {
      if (!isUUID(userId)) {
        return res.status(400).json({ success: false, message: 'ID user tidak valid.' })
      }
      params.push(userId)
      whereClause = `WHERE s.user_id = $${params.length}`
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM slot_spins s ${whereClause}`,
      params
    )

    params.push(limit, offset)
    const result = await pool.query(
      `SELECT s.id, s.user_id, s.bet, s.symbols, s.win_amount, s.multiplier,
         s.balance_before, s.balance_after, s.is_big_win, s.created_at,
         u.phone AS user_phone, u.full_name AS user_name
       FROM slot_spins s
       JOIN users u ON u.id = s.user_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    res.json({
      success: true,
      spins: result.rows,
      pagination: {
        page, limit,
        total: countResult.rows[0].total,
        total_pages: Math.ceil(countResult.rows[0].total / limit),
      },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data spin slot.')
  }
})

// =====================================================
// 27. ADMIN: STATISTIK RTP SLOT
// =====================================================

app.get('/api/admin/slot/stats', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM slot_stats_view')

    const row = result.rows[0] || {}
    const totalBet = Number(row.total_bet || 0)
    const totalWin = Number(row.total_win || 0)
    const actualHouseEdge = Number(row.actual_house_edge_percent || 0)

    // flag anomali: kalau house edge < 0% (pemain untung terus) atau > 25% (RTP rusak)
    let warning = null
    if (totalBet > 100000) {  // butuh minimal 100rb volume untuk inspeksi
      if (actualHouseEdge < 0) {
        warning = 'House edge negatif dalam volume besar. Cek RNG / paytable.'
      } else if (actualHouseEdge > 25) {
        warning = 'House edge terlalu tinggi. Cek paytable atau potensi bug payout.'
      }
    }

    res.json({
      success: true,
      stats: {
        total_spins: Number(row.total_spins || 0),
        winning_spins: Number(row.winning_spins || 0),
        losing_spins: Number(row.losing_spins || 0),
        big_wins: Number(row.big_wins || 0),
        total_bet: totalBet,
        total_win: totalWin,
        actual_rtp_percent: Number(row.actual_rtp_percent || 0),
        actual_house_edge_percent: actualHouseEdge,
        theoretical_rtp_percent: 91.0,
        theoretical_house_edge_percent: 9.0,
        rtp_deviation_percent: Number((actualHouseEdge - 9.0).toFixed(2)),
        warning,
      },
    })
  } catch (error) {
    handleError(res, error, 'Gagal mengambil statistik slot.')
  }
})
// =====================================================
// ADMIN: STATISTIK PEMAIN GAME
// =====================================================

app.get('/api/admin/game-stats', authenticateAdmin, async (req, res) => {
  try {
    // Query untuk menghitung total kerugian/keuntungan per user
    const result = await pool.query(`
      SELECT 
        u.id AS user_id,
        u.phone,
        u.full_name,
        COUNT(s.id)::int AS total_spins,
        COALESCE(SUM(s.bet), 0)::int AS total_bet,
        COALESCE(SUM(s.win_amount), 0)::int AS total_win,
        COALESCE(SUM(s.bet) - SUM(s.win_amount), 0)::int AS house_profit
      FROM users u
      JOIN slot_spins s ON s.user_id = u.id
      GROUP BY u.id, u.phone, u.full_name
      ORDER BY house_profit DESC
    `);

    // Menghitung total keseluruhan (Grand Total) untuk ringkasan
    const grandTotal = {
      total_spins: result.rows.reduce((acc, curr) => acc + curr.total_spins, 0),
      total_bet: result.rows.reduce((acc, curr) => acc + curr.total_bet, 0),
      total_win: result.rows.reduce((acc, curr) => acc + curr.total_win, 0),
      house_profit: result.rows.reduce((acc, curr) => acc + curr.house_profit, 0),
    };

    res.json({
      success: true,
      stats: result.rows,
      grand_total: grandTotal
    });
  } catch (error) {
    handleError(res, error, 'Gagal mengambil statistik permainan.');
  }
});
// =====================================================
// API: SISTEM TUKAR POIN (REWARDS)
// =====================================================

// 1. Ambil daftar hadiah yang tersedia
app.get('/api/rewards', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rewards WHERE is_active = TRUE AND stock > 0 ORDER BY points_required ASC'
    );
    res.json({ success: true, rewards: result.rows });
  } catch (error) {
    handleError(res, error, 'Gagal mengambil daftar hadiah.');
  }
});

// 2. Proses penukaran poin
app.post('/api/rewards/redeem', authenticateUser, async (req, res) => {
  const { reward_id, destination_number } = req.body;

  if (!reward_id || !destination_number) {
    return res.status(400).json({ success: false, message: 'Data penukaran tidak lengkap.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cek apakah hadiah ada dan stoknya cukup
    const rewardResult = await client.query('SELECT * FROM rewards WHERE id = $1 AND is_active = TRUE FOR UPDATE', [reward_id]);
    if (rewardResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Hadiah tidak ditemukan atau tidak aktif.' });
    }
    const reward = rewardResult.rows[0];
    if (reward.stock <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Stok hadiah habis.' });
    }

    // Cek saldo poin user
    const userResult = await client.query('SELECT points, full_name, phone FROM users WHERE id = $1 FOR UPDATE', [req.user.userId]);
    const user = userResult.rows[0];
    if (user.points < reward.points_required) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Poin Anda tidak mencukupi.' });
    }

    // 1. Potong poin user
    await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [reward.points_required, req.user.userId]);

    // 2. Kurangi stok hadiah
    await client.query('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [reward.id]);

    // 3. Buat pesanan otomatis (agar masuk ke antrean Admin)
    // Kita gunakan produk 'FREE FIRE' yang sudah ada di database sebagai wadah
    const productResult = await client.query("SELECT id FROM products WHERE code = 'FREEFIRE' LIMIT 1");
    const productId = productResult.rowCount > 0 ? productResult.rows[0].id : null;

    if (productId) {
      const orderNumber = 'RWD' + Date.now().toString() + crypto.randomBytes(3).toString('hex').toUpperCase();
      await client.query(
        `INSERT INTO orders (order_number, user_id, product_id, variant_name_snapshot, customer_name, customer_phone, destination_number, amount, total_amount, order_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'processing')`,
        [orderNumber, req.user.userId, productId, reward.name, user.full_name || 'Pelanggan', user.phone, destination_number, 0, 0]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Berhasil menukar poin dengan ${reward.name}! Silakan cek menu Pesanan.` });

  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, error, 'Gagal memproses penukaran poin.');
  } finally {
    client.release();
  }
});
// =====================================================
// FITUR PRINT & FOTOCOPY
// =====================================================

// 1. Endpoint User: Pesan Print/Fotocopy
app.post('/api/print/order', authenticateUser, async (req, res) => {
  const { customer_name, service_type, quantity, notes, total_price } = req.body;

  if (!customer_name || !service_type || !quantity || !total_price) {
    return res.status(400).json({ success: false, message: 'Data pesanan tidak lengkap.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Cek Saldo User
    const userResult = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.user.userId]);
    const balance = Number(userResult.rows[0].balance);

    if (balance < total_price) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Saldo tidak mencukupi. Silakan Top Up.' });
    }

    // Potong Saldo
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [total_price, req.user.userId]);

    // Simpan Pesanan Print
    const result = await client.query(
      `INSERT INTO print_orders (user_id, customer_name, service_type, quantity, notes, total_price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [req.user.userId, customer_name, service_type, quantity, notes, total_price]
    );

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: 'Pesanan Print berhasil! Silakan sebutkan nama Anda ke kasir.',
      order_id: result.rows[0].id 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleError(res, error, 'Gagal membuat pesanan print.');
  } finally {
    client.release();
  }
});

// 2. Endpoint Admin: Lihat Daftar Antrean Print
app.get('/api/admin/print-orders', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, u.phone FROM print_orders p 
       JOIN users u ON u.id = p.user_id 
       WHERE p.status = 'pending' ORDER BY p.created_at ASC`
    );
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    handleError(res, error, 'Gagal mengambil data antrean print.');
  }
});


// =====================================================
// 28. JALANKAN SERVER
// =====================================================

// Hapus atau beri komentar baris app.listen
// app.listen(PORT, () => console.log('Server running'))

// Tambahkan ini di paling bawah untuk Vercel
// =====================================================
// MENYAJIKAN FRONTEND REACT (Folder dist)
// =====================================================

// =====================================================
// 26. MENYAJIKAN FRONTEND DIGITALKU
// =====================================================

const path = require('path');

const frontendDist = path.join(__dirname, 'dist');

app.use(express.static(frontendDist));

app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendDist, 'index.html'));
});

// =====================================================
// 27. PENANGANAN ROUTE TIDAK DITEMUKAN
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan.'
  });
});

// =====================================================
// 28. PENANGANAN ERROR UMUM
// =====================================================

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) return next(error);

  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan pada server.'
  });
});

module.exports = app;
