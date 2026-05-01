const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimit');

// Public routes
router.get('/plans', subscriptionController.getPlans);
router.get('/plans/:planId', subscriptionController.getPlan);

// Protected routes
router.use(auth);

router.get('/me', subscriptionController.getMySubscription);
router.get('/usage', subscriptionController.getUsage);
router.get('/billing', subscriptionController.getBillingHistory);

router.post('/create',
  generalLimiter,
  subscriptionController.createSubscription
);

router.post('/cancel',
  subscriptionController.cancelSubscription
);

router.post('/reactivate',
  subscriptionController.reactivateSubscription
);

router.put('/change-plan',
  subscriptionController.changePlan
);

router.get('/invoices/:paymentId/download',
  subscriptionController.downloadInvoice
);

// Webhook for subscription events (public)
router.post('/webhook', subscriptionController.webhook);

module.exports = router;