const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimit');

// Public webhook
router.post('/webhook', paypalController.webhook);

// Protected routes
router.use(auth);

router.post('/create-order',
  generalLimiter,
  paypalController.createOrder
);

router.post('/capture',
  generalLimiter,
  paypalController.captureOrder
);

router.get('/order/:orderId',
  paypalController.getOrderDetails
);

// Admin only
router.use(authorize('admin'));

router.post('/refund',
  paypalController.refundPayment
);

module.exports = router;