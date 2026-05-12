const router = require('express').Router();
const { getMyAnalytics, adminStats, adminGetUsers, adminToggleUser, adminDeleteResume } = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/me', protect, getMyAnalytics);
router.get('/admin/stats', protect, adminOnly, adminStats);
router.get('/admin/users', protect, adminOnly, adminGetUsers);
router.put('/admin/users/:id/toggle', protect, adminOnly, adminToggleUser);
router.delete('/admin/resumes/:id', protect, adminOnly, adminDeleteResume);

module.exports = router;
