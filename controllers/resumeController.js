const pool = require('../config/db');
const { generateSlug, generateShareToken, calculateATSScore, getATSSuggestions } = require('../utils/helpers');
const { checkAndAwardBadges } = require('./userController');
const QRCode = require('qrcode');

exports.createResume = async (req, res) => {
  try {
    const { title, template_id } = req.body;
    const slug = generateSlug(title || 'my-resume');
    const shareToken = generateShareToken();

    const { rows } = await pool.query(
      `INSERT INTO resumes (user_id, template_id, title, slug, share_token)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, template_id || null, title || 'My Resume', slug, shareToken]
    );

    await checkAndAwardBadges(req.user.id);
    res.status(201).json({ success: true, resume: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getResumes = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, t.name as template_name, t.slug as template_slug
       FROM resumes r LEFT JOIN templates t ON r.template_id = t.id
       WHERE r.user_id = $1 ORDER BY r.updated_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, resumes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getResume = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, t.name as template_name, t.slug as template_slug
       FROM resumes r LEFT JOIN templates t ON r.template_id = t.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.json({ success: true, resume: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateResume = async (req, res) => {
  try {
    const fields = [
      'title', 'template_id', 'is_public', 'theme_color', 'font_family', 'language',
      'personal_info', 'career_objective', 'education', 'experience', 'skills',
      'projects', 'certifications', 'achievements', 'languages', 'interests',
      'workshops', 'internships', 'publications', 'custom_sections', 'section_order',
    ];

    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(
          typeof req.body[field] === 'object' ? JSON.stringify(req.body[field]) : req.body[field]
        );
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    values.push(req.params.id, req.user.id);
    const { rows } = await pool.query(
      `UPDATE resumes SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found' });

    const atsScore = calculateATSScore(rows[0]);
    await pool.query('UPDATE resumes SET ats_score = $1 WHERE id = $2', [atsScore, rows[0].id]);

    await checkAndAwardBadges(req.user.id);
    res.json({ success: true, resume: { ...rows[0], ats_score: atsScore } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.duplicateResume = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found' });

    const original = rows[0];
    const slug = generateSlug(`${original.title}-copy`);
    const shareToken = generateShareToken();

    const { rows: newResume } = await pool.query(
      `INSERT INTO resumes (user_id, template_id, title, slug, share_token, theme_color, font_family, language,
        personal_info, career_objective, education, experience, skills, projects, certifications,
        achievements, languages, interests, workshops, internships, publications, custom_sections, section_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        req.user.id, original.template_id, `${original.title} (Copy)`, slug, shareToken,
        original.theme_color, original.font_family, original.language,
        JSON.stringify(original.personal_info), original.career_objective,
        JSON.stringify(original.education), JSON.stringify(original.experience),
        JSON.stringify(original.skills), JSON.stringify(original.projects),
        JSON.stringify(original.certifications), JSON.stringify(original.achievements),
        JSON.stringify(original.languages), JSON.stringify(original.interests),
        JSON.stringify(original.workshops), JSON.stringify(original.internships),
        JSON.stringify(original.publications), JSON.stringify(original.custom_sections),
        JSON.stringify(original.section_order),
      ]
    );

    res.status(201).json({ success: true, resume: newResume[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPublicResume = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar, t.slug as template_slug
       FROM resumes r JOIN users u ON r.user_id = u.id LEFT JOIN templates t ON r.template_id = t.id
       WHERE r.share_token = $1 AND r.is_public = true`,
      [req.params.token]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found or private' });

    await pool.query('UPDATE resumes SET view_count = view_count + 1 WHERE id = $1', [rows[0].id]);
    await pool.query(
      'INSERT INTO analytics (resume_id, user_id, event_type, ip_address) VALUES ($1, $2, $3, $4)',
      [rows[0].id, rows[0].user_id, 'share_visit', req.ip]
    );

    res.json({ success: true, resume: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateQRCode = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT share_token, is_public FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found' });

    const url = `${process.env.CLIENT_URL}/r/${rows[0].share_token}`;
    const qrCode = await QRCode.toDataURL(url);
    res.json({ success: true, qrCode, url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getATSScore = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Resume not found' });

    const score = calculateATSScore(rows[0]);
    const suggestions = getATSSuggestions(rows[0]);
    res.json({ success: true, score, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveVersion = async (req, res) => {
  try {
    const { rows: resume } = await pool.query('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!resume[0]) return res.status(404).json({ success: false, message: 'Resume not found' });

    const { rows: versions } = await pool.query(
      'SELECT MAX(version_number) as max_v FROM resume_versions WHERE resume_id = $1',
      [req.params.id]
    );
    const versionNumber = (versions[0].max_v || 0) + 1;

    const { rows } = await pool.query(
      'INSERT INTO resume_versions (resume_id, version_number, snapshot) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, versionNumber, JSON.stringify(resume[0])]
    );

    res.status(201).json({ success: true, version: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getVersions = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, version_number, created_at FROM resume_versions WHERE resume_id = $1 ORDER BY version_number DESC',
      [req.params.id]
    );
    res.json({ success: true, versions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rv.snapshot FROM resume_versions rv
       JOIN resumes r ON rv.resume_id = r.id
       WHERE rv.id = $1 AND r.user_id = $2`,
      [req.params.versionId, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Version not found' });

    const snap = rows[0].snapshot;
    await pool.query(
      `UPDATE resumes SET personal_info=$1, career_objective=$2, education=$3, experience=$4,
       skills=$5, projects=$6, certifications=$7, achievements=$8, languages=$9, interests=$10,
       workshops=$11, internships=$12, publications=$13, custom_sections=$14, section_order=$15
       WHERE id=$16 AND user_id=$17`,
      [
        JSON.stringify(snap.personal_info), snap.career_objective,
        JSON.stringify(snap.education), JSON.stringify(snap.experience),
        JSON.stringify(snap.skills), JSON.stringify(snap.projects),
        JSON.stringify(snap.certifications), JSON.stringify(snap.achievements),
        JSON.stringify(snap.languages), JSON.stringify(snap.interests),
        JSON.stringify(snap.workshops), JSON.stringify(snap.internships),
        JSON.stringify(snap.publications), JSON.stringify(snap.custom_sections),
        JSON.stringify(snap.section_order), req.params.id, req.user.id,
      ]
    );

    res.json({ success: true, message: 'Version restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.trackDownload = async (req, res) => {
  try {
    await pool.query('UPDATE resumes SET download_count = download_count + 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    await pool.query(
      'INSERT INTO analytics (resume_id, user_id, event_type) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, 'download']
    );
    await checkAndAwardBadges(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
