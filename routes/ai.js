const router = require('express').Router();
const { generateSummary, generateSkillSuggestions, generateInterviewQuestions, generateProjectDescription } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/summary', generateSummary);
router.post('/skills', generateSkillSuggestions);
router.post('/interview-questions', generateInterviewQuestions);
router.post('/project-description', generateProjectDescription);

module.exports = router;
