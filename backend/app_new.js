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

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET tidak valid')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL tidak valid')

const JWT_SECRET = process.env.JWT_SECRET
const SERVICE_FEE = 0

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

app.use(cors())
app.use(express.json({ limit: '10kb' }))

const userOrderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 })

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUUID = (v) => typeof v === 'string' && UUID_REGEX.test(v)
const normalizePhone = (v) => String(v || '').replace(/\D/g, '')

function authenticateUser(req, res, next) {
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null
  if (!token) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'DIGITALKU', audience: 'DIGITALKU-USER' })
    if (!decoded.userId) return res.status(401).json({ success: false, message: 'Token user tidak valid.' })
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid.' })
  }
}

function handleError(res, error, message = 'Terjadi kesalahan pada server.') {
  console.error(error)
  return res.status(500).json({ success: false, message })
}

app.get('/api/health', (req, res) => res.json({ success: true, status: 'online' }))

// =====================================================
// MISI: CEK SEMUA MISI
// =====================================================
app.get('/api/users/mission', authenticateUser, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT has_claimed_mission_bonus, has_claimed_mission_level2, has_claimed_mission_level3 FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (userResult.rowCount === 0) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' })

    const orderResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    const totalTransactions = orderResult.rows[0].total
    const u = userResult.rows[0]

    const missions = [
      { id: 'level1', title: 'Misi Pemula', target: 15, bonus: 20000, has_claimed: u.has_claimed_mission_bonus, can_claim: totalTransactions >= 15 && !u.has_claimed_mission_bonus },
      { id: 'level2', title: 'Misi Setia', target: 30, bonus: 50000, has_claimed: u.has_claimed_mission_level2, can_claim: totalTransactions >= 30 && !u.has_claimed_mission_level2 },
      { id: 'level3', title: 'Misi Sultan', target: 50, bonus: 100000, has_claimed: u.has_claimed_mission_level3, can_claim: totalTransactions >= 50 && !u.has_claimed_mission_level3 },
    ]
    res.json({ success: true, total_transactions: totalTransactions, missions })
  } catch (error) { handleError(res, error, 'Gagal mengambil data misi.') }
})

// =====================================================
// MISI LEVEL 1: KLAIM Rp 20.000
// =====================================================
app.post('/api/users/claim-mission', authenticateUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT has_claimed_mission_bonus FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rows[0].has_claimed_mission_bonus) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim bonus ini.' }) }
    const orderResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    if (orderResult.rows[0].total < 15) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 15 transaksi.' }) }
    await client.query('UPDATE users SET balance = balance + 20000, has_claimed_mission_bonus = true WHERE id = $1', [req.user.userId])
    await client.query('COMMIT')
    res.json({ success: true, message: 'Bonus Rp 20.000 berhasil ditambahkan.' })
  } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi.') }
  finally { client.release() }
})

// =====================================================
// MISI LEVEL 2: KLAIM Rp 50.000 (30 TRANSAKSI)
// =====================================================
app.post('/api/users/claim-mission-level2', authenticateUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT has_claimed_mission_level2 FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rows[0].has_claimed_mission_level2) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim Misi Setia.' }) }
    const orderResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    if (orderResult.rows[0].total < 30) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 30 transaksi.' }) }
    await client.query('UPDATE users SET balance = balance + 50000, has_claimed_mission_level2 = true WHERE id = $1', [req.user.userId])
    await client.query('COMMIT')
    res.json({ success: true, message: 'Bonus Misi Setia Rp 50.000 berhasil ditambahkan.' })
  } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi level 2.') }
  finally { client.release() }
})

// =====================================================
// MISI LEVEL 3: KLAIM Rp 100.000 (50 TRANSAKSI)
// =====================================================
app.post('/api/users/claim-mission-level3', authenticateUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT has_claimed_mission_level3 FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (userResult.rows[0].has_claimed_mission_level3) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim Misi Sultan.' }) }
    const orderResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`,
      [req.user.userId]
    )
    if (orderResult.rows[0].total < 50) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 50 transaksi.' }) }
    await client.query('UPDATE users SET balance = balance + 100000, has_claimed_mission_level3 = true WHERE id = $1', [req.user.userId])
    await client.query('COMMIT')
    res.json({ success: true, message: 'Bonus Misi Sultan Rp 100.000 berhasil ditambahkan.' })
  } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi level 3.') }
  finally { client.release() }
})

// =====================================================
// LOGIN USER (untuk test)
// =====================================================
app.post('/api/users/login', async (req, res) => {
  const phone = normalizePhone(String(req.body.phone || ''))
  const password = String(req.body.password || '')
  if (!phone || !password) return res.status(400).json({ success: false, message: 'Phone & password wajib.' })
  try {
    const result = await pool.query('SELECT id, phone, password_hash, full_name, is_active FROM users WHERE phone = $1 LIMIT 1', [phone])
    if (result.rowCount === 0 || !result.rows[0].is_active) return res.status(401).json({ success: false, message: 'HP/password salah.' })
    const user = result.rows[0]
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ success: false, message: 'HP/password salah.' })
    const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '30d', issuer: 'DIGITALKU', audience: 'DIGITALKU-USER' })
    res.json({ success: true, token, user: { id: user.id, phone: user.phone, full_name: user.full_name } })
  } catch (error) { handleError(res, error, 'Gagal login.') }
})

app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' }))

app.listen(PORT, () => {
  console.log(`DIGITALKU TEST backend berjalan di http://localhost:${PORT}`)
})