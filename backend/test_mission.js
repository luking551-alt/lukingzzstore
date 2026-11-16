const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { Pool } = require('pg')
require('dotenv').config()

const app = express()
const PORT = 3001

const JWT_SECRET = process.env.JWT_SECRET
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

app.use(cors())
app.use(express.json())

function authenticateUser(req, res, next) {
  const token = (req.headers.authorization || '').startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null
  if (!token) return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu.' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'DIGITALKU', audience: 'DIGITALKU-USER' })
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid.' })
  }
}

app.get('/api/health', (req, res) => res.json({ success: true, status: 'test_online' }))

// ENDPOINT 1: CEK MISI
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
    const total = orderResult.rows[0].total
    const u = userResult.rows[0]
    res.json({
      success: true,
      total_transactions: total,
      missions: [
        { id: 'level1', title: 'Misi Pemula', target: 15, bonus: 20000, has_claimed: u.has_claimed_mission_bonus, can_claim: total >= 15 && !u.has_claimed_mission_bonus },
        { id: 'level2', title: 'Misi Setia', target: 30, bonus: 50000, has_claimed: u.has_claimed_mission_level2, can_claim: total >= 30 && !u.has_claimed_mission_level2 },
        { id: 'level3', title: 'Misi Sultan', target: 50, bonus: 100000, has_claimed: u.has_claimed_mission_level3, can_claim: total >= 50 && !u.has_claimed_mission_level3 },
      ],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Gagal cek misi.' })
  }
})

// ENDPOINT 2: KLAIM MISI LEVEL 2
app.post('/api/users/claim-mission-level2', authenticateUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const u = await client.query('SELECT has_claimed_mission_level2 FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
    if (u.rows[0].has_claimed_mission_level2) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim Misi Setia.' }) }
    const o = await client.query(`SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`, [req.user.userId])
    if (o.rows[0].total < 30) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 30 transaksi.' }) }
    await client.query('UPDATE users SET balance = balance + 50000, has_claimed_mission_level2 = true WHERE id = $1', [req.user.userId])
    await client.query('COMMIT')
    res.json({ success: true, message: 'Bonus Misi Setia Rp 50.000 berhasil ditambahkan.' })
  } catch (error) { await client.query('ROLLBACK'); console.error(error); res.status(500).json({ success: false, message: 'Gagal klaim level 2.' }) }
  finally { client.release() }
})