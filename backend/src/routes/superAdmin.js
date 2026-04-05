const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdminController');

const router = express.Router();

// ── Public route — no auth needed (this IS the login for super admins) ──────
router.post('/login', superAdminController.superAdminLogin);

// ── All other routes require a valid system_admin JWT ────────────────────────
router.use(authenticate);
router.use(authorize('system_admin'));

// Companies
router.get('/companies', superAdminController.getGlobalDashboard);
router.post('/companies', superAdminController.createCompany);
router.patch('/companies/:id', superAdminController.updateCompany);
router.patch('/companies/:id/status', superAdminController.toggleCompanyStatus);
router.delete('/companies/:id', superAdminController.deleteCompany);           // NEW
router.get('/companies/:id/users', superAdminController.getCompanyAudits);
router.post('/companies/:id/candidates', superAdminController.createCandidate);
router.post('/companies/:id/topics', superAdminController.createCompanyTopic);
router.delete('/companies/:id/topics/:topicId', superAdminController.deleteCompanyTopic); // NEW

// System settings
router.get('/settings', superAdminController.getSettings);
router.patch('/settings', superAdminController.updateSetting);

module.exports = router;
