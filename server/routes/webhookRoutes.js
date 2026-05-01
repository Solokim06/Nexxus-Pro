const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { optionalAuth } = require('../middleware/auth');
const { rateLimit } = require('express-rate-limit');

// Webhook rate limiter (stricter limits)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  skipSuccessfulRequests: true,
});

// M-Pesa webhooks
router.post('/mpesa',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  webhookController.handleMpesaWebhook
);

router.post('/mpesa/confirmation',
  webhookLimiter,
  webhookController.mpesaConfirmation
);

router.post('/mpesa/validation',
  webhookLimiter,
  webhookController.mpesaValidation
);

router.post('/mpesa/result',
  webhookLimiter,
  webhookController.mpesaResult
);

// PayPal webhooks
router.post('/paypal',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  webhookController.handlePaypalWebhook
);

// Bank webhooks
router.post('/bank',
  webhookLimiter,
  webhookController.handleBankWebhook
);

// Stripe webhooks (if used in future)
router.post('/stripe',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);

// Generic webhook endpoint for custom integrations
router.post('/custom/:integrationId',
  webhookLimiter,
  optionalAuth,
  webhookController.handleCustomWebhook
);

// Webhook delivery status (for debugging)
router.get('/deliveries',
  optionalAuth,
  webhookController.getWebhookDeliveries
);

router.post('/deliveries/:deliveryId/retry',
  optionalAuth,
  webhookController.retryWebhookDelivery
);

module.exports = router;