const router = require('express').Router();
const {
  createResume, getResumes, getResume, updateResume, deleteResume, duplicateResume,
  getPublicResume, generateQRCode, getATSScore, saveVersion, getVersions, restoreVersion, trackDownload,
} = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');

router.get('/public/:token', getPublicResume);

router.use(protect);
router.route('/').get(getResumes).post(createResume);
router.route('/:id').get(getResume).put(updateResume).delete(deleteResume);
router.post('/:id/duplicate', duplicateResume);
router.get('/:id/qrcode', generateQRCode);
router.get('/:id/ats', getATSScore);
router.post('/:id/download', trackDownload);
router.route('/:id/versions').get(getVersions).post(saveVersion);
router.post('/:id/versions/:versionId/restore', restoreVersion);

module.exports = router;
