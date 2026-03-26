const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  listCandidates,
  getCandidateSessions,
  toggleCandidateStatus,
} = require('../controllers/adminController');

router.use(authenticate, authorize('admin', 'supervisor'));

router.get('/stats', getDashboardStats);
router.get('/candidates', listCandidates);
router.get('/candidates/:id/sessions', getCandidateSessions);
router.patch('/candidates/:id/status', toggleCandidateStatus);

module.exports = router;
