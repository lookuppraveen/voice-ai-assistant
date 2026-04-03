const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const companyController = require('../controllers/companyController');

const router = express.Router();

router.use(authenticate);
router.use(authorize('company_admin', 'system_admin'));

router.get('/users', companyController.getCompanyUsers);

router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 8 }),
  body('full_name').notEmpty().trim(),
], companyController.inviteUser);

router.put('/users/:userId/status', companyController.toggleUserStatus);

module.exports = router;
