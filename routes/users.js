const router = require('express').Router();
const { updateProfile, uploadAvatar, getUserBadges } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);
router.get('/badges', protect, getUserBadges);

module.exports = router;
