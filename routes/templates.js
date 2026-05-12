const router = require('express').Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM templates WHERE is_active = true ORDER BY name');
    res.json({ success: true, templates: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
