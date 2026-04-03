const router = require('express').Router();
const { body } = require('express-validator');
const { register, login, getMe, updateProfile } = require('../controllers/authController');
const { registerCompany } = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name required'),
  body('role')
    .optional()
    .isIn(['candidate', 'supervisor', 'admin'])
    .withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerValidation, register);

const registerCompanyValidation = [
  body('company_name').trim().notEmpty().withMessage('Company name required'),
  body('admin_email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('admin_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('admin_name').trim().notEmpty().withMessage('Admin full name required'),
];
router.post('/register-company', registerCompanyValidation, registerCompany);

router.post('/login', loginValidation, login);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
