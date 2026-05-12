const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { generateToken, sendEmail } = require('../utils/helpers');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows[0])
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role, avatar',
      [name, email, hashed]
    );

    const token = generateToken(rows[0].id);
    res.status(201).json({ success: true, token, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [rows[0].id]);

    const token = generateToken(rows[0].id);
    const { password: _, ...user } = rows[0];
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, avatar, phone, location, website, linkedin, github, portfolio, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'No user with that email' });

    const token = crypto.randomBytes(20).toString('hex');
    const expire = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expire = $2 WHERE id = $3',
      [token, expire, rows[0].id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await sendEmail({
      to: email,
      subject: 'Password Reset - Resume Builder',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 10 minutes.</p>`,
    });

    res.json({ success: true, message: 'Reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expire > NOW()',
      [token]
    );
    if (!rows[0]) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expire = NULL WHERE id = $2',
      [hashed, rows[0].id]
    );

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
