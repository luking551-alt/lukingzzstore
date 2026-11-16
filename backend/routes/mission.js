const express = require('express')
const router = express.Router()

module.exports = function(pool, authenticateUser, handleError) {
  // =====================================================
  // ENDPOINT 1: CEK SEMUA MISI (Level 1, 2, 3)
  // =====================================================
  router.get('/mission', authenticateUser, async (req, res) => {
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
      handleError(res, error, 'Gagal mengambil data misi.')
    }
  })

  // =====================================================
  // ENDPOINT 2: KLAIM MISI LEVEL 1 (Rp 20.000)
  // =====================================================
  router.post('/claim-mission', authenticateUser, async (req, res) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const u = await client.query('SELECT has_claimed_mission_bonus FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
      if (u.rows[0].has_claimed_mission_bonus) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim.' }) }
      const o = await client.query(`SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`, [req.user.userId])
      if (o.rows[0].total < 15) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 15 transaksi.' }) }
      await client.query('UPDATE users SET balance = balance + 20000, has_claimed_mission_bonus = true WHERE id = $1', [req.user.userId])
      await client.query('COMMIT')
      res.json({ success: true, message: 'Bonus Rp 20.000 berhasil ditambahkan.' })
    } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi level 1.') }
    finally { client.release() }
  })

  // =====================================================
  // ENDPOINT 3: KLAIM MISI LEVEL 2 (Rp 50.000)
  // =====================================================
  router.post('/claim-mission-level2', authenticateUser, async (req, res) => {
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
    } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi level 2.') }
    finally { client.release() }
  })

  // =====================================================
  // ENDPOINT 4: KLAIM MISI LEVEL 3 (Rp 100.000)
  // =====================================================
  router.post('/claim-mission-level3', authenticateUser, async (req, res) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const u = await client.query('SELECT has_claimed_mission_level3 FROM users WHERE id = $1 FOR UPDATE', [req.user.userId])
      if (u.rows[0].has_claimed_mission_level3) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Sudah pernah klaim Misi Sultan.' }) }
      const o = await client.query(`SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1 AND order_status IN ('paid', 'processing', 'completed')`, [req.user.userId])
      if (o.rows[0].total < 50) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: 'Belum 50 transaksi.' }) }
      await client.query('UPDATE users SET balance = balance + 100000, has_claimed_mission_level3 = true WHERE id = $1', [req.user.userId])
      await client.query('COMMIT')
      res.json({ success: true, message: 'Bonus Misi Sultan Rp 100.000 berhasil ditambahkan.' })
    } catch (error) { await client.query('ROLLBACK'); handleError(res, error, 'Gagal klaim misi level 3.') }
    finally { client.release() }
  })

  return router
}