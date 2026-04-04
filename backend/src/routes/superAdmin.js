const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdminController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('system_admin')); // Strictly limit to system_admin

router.get('/companies', superAdminController.getGlobalDashboard);
router.patch('/companies/:id', superAdminController.updateCompany);
router.patch('/companies/:id/status', superAdminController.toggleCompanyStatus);
router.get('/companies/:id/users', superAdminController.getCompanyAudits);
router.post('/companies/:id/topics', superAdminController.createCompanyTopic);

router.get('/settings', superAdminController.getSettings);
router.patch('/settings', superAdminController.updateSetting);

module.exports = router;
