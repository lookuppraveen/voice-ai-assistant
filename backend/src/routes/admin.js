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
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin', 'supervisor'));

router.get('/stats', getDashboardStats);
router.get('/sessions', listAllSessions);
router.get('/candidates', listCandidates);
router.get('/candidates/:id/sessions', getCandidateSessions);
router.patch('/candidates/:id/status', toggleCandidateStatus);
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);

module.exports = router;
