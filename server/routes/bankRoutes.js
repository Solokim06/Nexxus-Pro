const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const { auth, authorize } = require('../middleware/auth');
const { validate, paymentValidation } = require('../middleware/validation');
const { uploadSingle } = require('../middleware/upload');
const { generalLimiter } = require('../middleware/rateLimit');

// Protected routes
router.use(auth);

router.post('/initiate',
  generalLimiter,
  paymentValidation.bankTransfer,
  validate,
  bankController.initiateBankTransfer
);

router.post('/confirm',
  uploadSingle('receipt'),
  bankController.confirmBankTransfer
);

router.get('/status/:reference',
  bankController.getTransferStatus
);

router.get('/details',
  bankController.getBankDetails
);

// Admin only routes
router.use(authorize('admin'));

router.get('/pending',
  bankController.getPendingTransfers
);

router.put('/verify/:paymentId',
  bankController.verifyBankTransfer
);

module.exports = router;