const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  listCandidates,
  getCandidateSessions,
  toggleCandidateStatus,
  listAllSessions,
  listUsers,
  updateUserRole,
  getSkillsReport,
  getTrendsReport,
  getComparisonReport,
  getCandidateRecommendations,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin', 'supervisor', 'company_admin', 'system_admin'));

router.get('/stats', getDashboardStats);
router.get('/sessions', listAllSessions);
router.get('/candidates', listCandidates);
router.get('/candidates/:id/sessions', getCandidateSessions);
router.get('/candidates/:id/recommendations', getCandidateRecommendations);
router.patch('/candidates/:id/status', toggleCandidateStatus);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.get('/reports/skills', getSkillsReport);
router.get('/reports/trends', getTrendsReport);
router.get('/reports/compare', getComparisonReport);

module.exports = router;
