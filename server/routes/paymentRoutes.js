const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth } = require('../middleware/auth');
const { validate, paymentValidation, idParamValidation } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(auth);

// Payment methods
router.get('/methods',
  paymentController.getPaymentMethods
);

// Process payments
router.post('/process',
  generalLimiter,
  paymentValidation.process,
  validate,
  paymentController.processPayment
);

router.post('/verify',
  paymentController.verifyPayment
);

// Payment history
router.get('/history',
  paymentController.getPaymentHistory
);

router.get('/:paymentId',
  idParamValidation,
  validate,
  paymentController.getPayment
);

// Invoices
router.get('/invoices',
  paymentController.getInvoices
);

router.get('/invoices/:paymentId/download',
  idParamValidation,
  validate,
  paymentController.downloadInvoice
);

// Refunds
router.post('/:paymentId/refund',
  idParamValidation,
  validate,
  paymentController.requestRefund
);

// Saved payment methods
router.get('/saved-methods',
  paymentController.getSavedPaymentMethods
);

router.post('/save-method',
  paymentController.savePaymentMethod
);

router.delete('/saved-methods/:methodId',
  paymentController.deletePaymentMethod
);

module.exports = router;