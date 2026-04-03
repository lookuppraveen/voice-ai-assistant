const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const topicController = require('../controllers/topicController');

const router = express.Router();

router.use(authenticate);

// All authenticated users in a company can list scenarios/topics
router.get('/', topicController.listTopics);

// Only admins can create/update/delete topics
router.post(
  '/',
  authorize('company_admin', 'system_admin'),
  [
    body('name').notEmpty().trim(),
    body('system_prompt').notEmpty().trim(),
  ],
  topicController.createTopic
);

router.get(
  '/:id',
  authorize('company_admin', 'system_admin'),
  topicController.getTopic
);

router.put(
  '/:id',
  authorize('company_admin', 'system_admin'),
  topicController.updateTopic
);

router.delete(
  '/:id',
  authorize('company_admin', 'system_admin'),
  topicController.deleteTopic
);

module.exports = router;
