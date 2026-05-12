const pool = require('../config/db');

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, location, website, linkedin, github, portfolio, bio } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET name=$1, phone=$2, location=$3, website=$4, linkedin=$5, github=$6, portfolio=$7, bio=$8
       WHERE id=$9 RETURNING id, name, email, role, avatar, phone, location, website, linkedin, github, portfolio, bio`,
      [name, phone, location, website, linkedin, github, portfolio, bio, req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const avatarUrl = `/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      'UPDATE users SET avatar = $1 WHERE id = $2 RETURNING avatar',
      [avatarUrl, req.user.id]
    );
    res.json({ success: true, avatar: rows[0].avatar });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUserBadges = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, ub.earned_at FROM badges b
       JOIN user_badges ub ON b.id = ub.badge_id
       WHERE ub.user_id = $1 ORDER BY ub.earned_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, badges: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.checkAndAwardBadges = async (userId) => {
  try {
    const { rows: resumes } = await pool.query(
      'SELECT ats_score, view_count, download_count FROM resumes WHERE user_id = $1',
      [userId]
    );
    const resumeCount = resumes.length;
    const maxATS = Math.max(...resumes.map((r) => r.ats_score || 0), 0);
    const totalViews = resumes.reduce((s, r) => s + (r.view_count || 0), 0);
    const totalDownloads = resumes.reduce((s, r) => s + (r.download_count || 0), 0);

    const { rows: badges } = await pool.query('SELECT * FROM badges');

    for (const badge of badges) {
      let earned = false;
      if (badge.condition_type === 'resume_count' && resumeCount >= badge.condition_value) earned = true;
      if (badge.condition_type === 'ats_score' && maxATS >= badge.condition_value) earned = true;
      if (badge.condition_type === 'view_count' && totalViews >= badge.condition_value) earned = true;
      if (badge.condition_type === 'download_count' && totalDownloads >= badge.condition_value) earned = true;

      if (earned) {
        await pool.query(
          'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, badge.id]
        );
      }
    }
  } catch (err) {
    console.error('Badge check error:', err.message);
  }
};
