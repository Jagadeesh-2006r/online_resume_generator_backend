const pool = require('../config/db');

exports.getMyAnalytics = async (req, res) => {
  try {
    const { rows: resumes } = await pool.query(
      'SELECT id, title, view_count, download_count, ats_score, created_at FROM resumes WHERE user_id = $1',
      [req.user.id]
    );

    const { rows: events } = await pool.query(
      `SELECT event_type, COUNT(*) as count, DATE(created_at) as date
       FROM analytics WHERE user_id = $1
       GROUP BY event_type, DATE(created_at) ORDER BY date DESC LIMIT 30`,
      [req.user.id]
    );

    const totalViews = resumes.reduce((s, r) => s + (r.view_count || 0), 0);
    const totalDownloads = resumes.reduce((s, r) => s + (r.download_count || 0), 0);

    res.json({ success: true, analytics: { resumes, events, totalViews, totalDownloads } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin Controllers
exports.adminStats = async (req, res) => {
  try {
    const [users, resumes, templates, recentUsers] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users WHERE role != $1', ['admin']),
      pool.query('SELECT COUNT(*) FROM resumes'),
      pool.query(`SELECT t.name, t.slug, COUNT(r.id) as usage_count
                  FROM templates t LEFT JOIN resumes r ON t.id = r.template_id
                  GROUP BY t.id ORDER BY usage_count DESC`),
      pool.query('SELECT id, name, email, created_at, last_login, is_active FROM users ORDER BY created_at DESC LIMIT 10'),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(users.rows[0].count),
        totalResumes: parseInt(resumes.rows[0].count),
        templateUsage: templates.rows,
        recentUsers: recentUsers.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminGetUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login,
              COUNT(r.id) as resume_count
       FROM users u LEFT JOIN resumes r ON u.id = r.user_id
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: total } = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ success: true, users: rows, total: parseInt(total[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminToggleUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active',
      [req.params.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminDeleteResume = async (req, res) => {
  try {
    await pool.query('DELETE FROM resumes WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Resume deleted by admin' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
