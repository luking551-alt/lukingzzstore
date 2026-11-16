
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
const { rateLimit } = require('express-rate-limit')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

// Pemeriksaan konfigurasi keamanan
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET belum tersedia atau terlalu pendek di .env')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum tersedia di .env')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

app.use(cors())
app.use(express.json({ limit: '10kb' }))

// Biaya layanan awal Rp0.
const SERVICE_FEE = 0

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
  },
})

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak permintaan pesanan. Coba lagi nanti.',
  },
})

function validSetupKey(providedKey) {
  const secret = process.env.ADMIN_SETUP_KEY

  if (!secret || typeof providedKey !== 'string') {
    return false
  }

  const expected = Buffer.from(secret)
  const received = Buffer.from(providedKey)

  if (expected.length !== received.length) {
    return false
  }

  return crypto.timingSafeEqual(expected, received)
}

function authenticateAdmin(req, res, next) {
  const authorization = req.headers.authorization

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token login diperlukan.',
    })
  }

  const token = authorization.slice(7)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'DIGITALKU',
      audience: 'DIGITALKU-ADMIN',
    })

    req.admin = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau sudah kedaluwarsa.',
    })
  }
}

function normalizePhone(value) {
  if (typeof value !== 'string') return null

  const digits = value.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 15) {
    return null
  }

  return digits
}

// Halaman utama API
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DIGITALKU Backend API aktif',
    version: '1.0.0',
  })
})

// Pemeriksaan server
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    service: 'DIGITALKU API',
    timestamp: new Date().toISOString(),
  })
})

// Pemeriksaan database
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS server_time, current_database() AS database_name'
    )

    res.json({
      success: true,
      message: 'Koneksi Neon berhasil!',
      database: result.rows[0].database_name,
      server_time: result.rows[0].server_time,
    })
  } catch (error) {
    console.error('Database connection error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Koneksi database gagal.',
    })
  }
})

// Mengambil daftar produk aktif
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, description
       FROM products
       WHERE is_active = true
       ORDER BY name ASC`
    )

    res.json({
      success: true,
      products: result.rows,
    })
  } catch (error) {
    console.error('Product list error:', error.message)

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar produk.',
    })
  }
})

// Membuat pesanan pelanggan
app.post('/api/orders', orderLimiter, async (req, res) => {
  const {
    product_id,
    customer_name,
    customer_phone,
    destination_number,
    amount,
  } = req.body || {}

  if (
    typeof product_id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product_id)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Produk tidak valid.',
    })
  }

  if (
    !Number.isSafeInteger(amount) ||
    amount < 10000 ||
    amount > 1000000 ||
    amount % 1000 !== 0
  ) {
    return res.status(400).json({
      success: false,
      message: 'Nominal harus Rp10.000 sampai Rp1.000.000 dengan kelipatan Rp1.000.',
    })
  }

  const normalizedCustomerPhone = normalizePhone(customer_phone)

  if (!normalizedCustomerPhone) {
    return res.status(400).json({
      success: false,
      message: 'Nomor HP pelanggan tidak valid.',
    })
  }

  const normalizedDestination = normalizePhone(destination_number)

  if (!normalizedDestination) {
    return res.status(400).json({
      success: false,
      message: 'Nomor tujuan isi saldo tidak valid.',
    })
  }

  if (
    customer_name !== undefined &&
    customer_name !== null &&
    (
      typeof customer_name !== 'string' ||
      customer_name.trim().length > 80
    )
  ) {
    return res.status(400).json({
      success: false,
      message: 'Nama pelanggan maksimal 80 karakter.',
    })
  }

  let client

  try {
    client = await pool.connect()
    await client.query('BEGIN')

    const productResult = await client.query(
      `SELECT id, name, code
       FROM products
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [product_id]
    )

    if (productResult.rowCount === 0) {
      await client.query('ROLLBACK')

      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan atau sedang tidak aktif.',
      })
    }

    const product = productResult.rows[0]
    const serviceFee = SERVICE_FEE
    const totalAmount = amount + serviceFee

    const orderNumber =
      'DK-' +
      Date.now().toString() +
      '-' +
      crypto.randomBytes(3).toString('hex').toUpperCase()

    const orderResult = await client.query(
      `INSERT INTO orders (
        order_number,
        product_id,
        customer_name,
        customer_phone,
        destination_number,
        amount,
        service_fee,
        total_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        order_number,
        tracking_token,
        amount,
        service_fee,
        total_amount,
        order_status,
        created_at`,
      [
        orderNumber,
        product.id,
        customer_name ? customer_name.trim() : null,
        normalizedCustomerPhone,
        normalizedDestination,
        amount,
        serviceFee,
        totalAmount,
      ]
    )

    const order = orderResult.rows[0]

    await client.query(
      `INSERT INTO payments (
        order_id,
        payment_method,
        expected_amount,
        payment_status
      )
      VALUES ($1, 'QRIS', $2, 'pending')`,
      [order.id, totalAmount]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat.',
      order: {
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        product: product.name,
        destination_number: normalizedDestination,
        amount: Number(order.amount),
        service_fee: Number(order.service_fee),
        total_amount: Number(order.total_amount),
        order_status: order.order_status,
        payment_status: 'pending',
        payment_method: 'QRIS',
        created_at: order.created_at,
      },
    })
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {})
    }

    console.error('Create order error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Pesanan gagal dibuat. Silakan coba lagi.',
    })
  } finally {
    if (client) client.release()
  }
})

// Pendaftaran administrator pertama
app.post('/api/admin/setup', setupLimiter, async (req, res) => {
  const setupKey = req.headers['x-admin-setup-key']
  const { username, password } = req.body || {}

  if (!validSetupKey(setupKey)) {
    return res.status(403).json({
      success: false,
      message: 'Kunci pendaftaran tidak valid.',
    })
  }

  if (
    typeof username !== 'string' ||
    !/^[a-zA-Z0-9_]{3,30}$/.test(username)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Username harus 3-30 karakter dan hanya berisi huruf, angka, atau garis bawah.',
    })
  }

  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      success: false,
      message: 'Password minimal 12 karakter dan maksimal 72 byte.',
    })
  }

  let client

  try {
    client = await pool.connect()

    await client.query('BEGIN')
    await client.query('LOCK TABLE admins IN EXCLUSIVE MODE')

    const existing = await client.query(
      'SELECT id FROM admins LIMIT 1'
    )

    if (existing.rowCount > 0) {
      await client.query('ROLLBACK')

      return res.status(403).json({
        success: false,
        message: 'Administrator sudah dibuat. Pendaftaran awal ditutup.',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await client.query(
      `INSERT INTO admins (username, password_hash)
       VALUES ($1, $2)`,
      [username, passwordHash]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      success: true,
      message: 'Administrator pertama berhasil dibuat.',
    })
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {})
    }

    console.error('Admin setup error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Pendaftaran administrator gagal.',
    })
  } finally {
    if (client) client.release()
  }
})

// Login administrator
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {}

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length > 30 ||
    password.length > 72
  ) {
    return res.status(400).json({
      success: false,
      message: 'Username atau password tidak valid.',
    })
  }

  try {
    const result = await pool.query(
      `SELECT id, username, password_hash, is_active
       FROM admins
       WHERE username = $1
       LIMIT 1`,
      [username]
    )

    const admin = result.rows[0]

    if (
      !admin ||
      !admin.is_active ||
      !(await bcrypt.compare(password, admin.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      })
    }

    const token = jwt.sign(
      {
        adminId: admin.id,
        username: admin.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '8h',
        issuer: 'DIGITALKU',
        audience: 'DIGITALKU-ADMIN',
      }
    )

    return res.json({
      success: true,
      message: 'Login administrator berhasil.',
      token,
      expiresIn: 28800,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error('Admin login error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat login.',
    })
  }
})

// Memeriksa token dan status administrator
app.get('/api/admin/me', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, is_active
       FROM admins
       WHERE id = $1
       LIMIT 1`,
      [req.admin.adminId]
    )

    const admin = result.rows[0]

    if (!admin || !admin.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Akun administrator tidak aktif.',
      })
    }

    return res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
      },
    })
  } catch (error) {
    console.error('Admin verification error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa akun administrator.',
    })
  }
})

// Mengambil daftar pesanan untuk dashboard admin
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    // Periksa kembali apakah akun admin masih aktif
    const adminResult = await pool.query(
      `SELECT id
       FROM admins
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [req.admin.adminId]
    )

    if (adminResult.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Akun administrator tidak aktif.',
      })
    }

    // Pagination: default 1 halaman, maksimal 100 pesanan
    const requestedPage = Number.parseInt(req.query.page, 10)
    const requestedLimit = Number.parseInt(req.query.limit, 10)

    const page = Number.isInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 1000000)
      : 1

    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 20

    const offset = (page - 1) * limit

    // Ambil data pesanan beserta produk dan pembayaran
    const ordersResult = await pool.query(
      `SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.customer_phone,
        o.destination_number,
        o.amount,
        o.service_fee,
        o.total_amount,
        o.order_status,
        o.created_at,
        o.updated_at,
        pr.name AS product_name,
        pr.code AS product_code,
        p.payment_method,
        p.expected_amount,
        p.received_amount,
        p.payment_status,
        p.verified_at,
        p.transaction_reference
       FROM orders o
       LEFT JOIN products pr ON pr.id = o.product_id
       LEFT JOIN payments p ON p.order_id = o.id
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    // Hitung jumlah seluruh pesanan
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM orders'
    )

    const totalOrders = countResult.rows[0].total

    const orders = ordersResult.rows.map((order) => ({
      ...order,
      amount: Number(order.amount),
      service_fee: Number(order.service_fee),
      total_amount: Number(order.total_amount),
      expected_amount: order.expected_amount === null
        ? null
        : Number(order.expected_amount),
      received_amount: order.received_amount === null
        ? null
        : Number(order.received_amount),
    }))

    return res.json({
      success: true,
      message: 'Daftar pesanan berhasil diambil.',
      pagination: {
        page,
        limit,
        total_orders: totalOrders,
        total_pages: Math.ceil(totalOrders / limit),
      },
      orders,
    })
  } catch (error) {
    console.error('Admin orders error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar pesanan.',
    })
  }
})

app.listen(PORT, () => {
  console.log('================================')
  console.log('   DIGITALKU BACKEND SERVER')
  console.log('================================')
  console.log(`Server berjalan di http://localhost:${PORT}`)
  console.log('Status: ONLINE')
})
