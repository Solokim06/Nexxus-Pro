const express = require('express');
const router = express.Router();
const mpesaController = require('../controllers/mpesaController');
const { auth, authorize } = require('../middleware/auth');
const { validate, paymentValidation } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimit');

// Public webhook endpoints (no auth)
router.post('/callback', mpesaController.callback);
router.post('/confirmation', mpesaController.confirmation);
router.post('/validation', mpesaController.validation);
router.post('/result', mpesaController.result);
router.post('/timeout', mpesaController.timeout);

// Protected routes (require auth)
router.use(auth);

// STK Push
router.post('/stkpush',
  generalLimiter,
  paymentValidation.mpesa,
  validate,
  mpesaController.stkPush
);

router.get('/status/:checkoutRequestId',
  mpesaController.queryStatus
);

// Admin only routes
router.use(authorize('admin'));

router.post('/simulate',
  mpesaController.simulatePayment
);

router.post('/register-urls',
  mpesaController.registerUrls
);

router.get('/balance/:shortCode',
  mpesaController.checkBalance
);

router.post('/reverse',
  mpesaController.reverseTransaction
);

module.exports = router;