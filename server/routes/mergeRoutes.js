const express = require('express');
const router = express.Router();
const mergeController = require('../controllers/mergeController');
const { auth } = require('../middleware/auth');
const { validate, mergeValidation, idParamValidation } = require('../middleware/validation');
const { uploadMultiple } = require('../middleware/upload');
const { checkMergeLimit } = require('../middleware/planLimits');
const { mergeLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(auth);

// Merge operations
router.post('/files',
  mergeLimiter,
  checkMergeLimit,
  uploadMultiple('files', 50),
  mergeValidation.mergeFiles,
  validate,
  mergeController.mergeFiles
);

router.post('/folders',
  mergeLimiter,
  checkMergeLimit,
  mergeController.mergeFolders
);

// Queue management
router.get('/queue',
  mergeController.getQueue
);

router.post('/queue',
  mergeController.addToQueue
);

router.delete('/queue/:jobId',
  idParamValidation,
  validate,
  mergeController.removeFromQueue
);

router.post('/queue/reorder',
  mergeController.reorderQueue
);

// Merge status and results
router.get('/status/:jobId',
  idParamValidation,
  validate,
  mergeController.getMergeStatus
);

router.get('/download/:jobId',
  idParamValidation,
  validate,
  mergeController.downloadMerge
);

router.post('/cancel/:jobId',
  idParamValidation,
  validate,
  mergeController.cancelMerge
);

// Merge history
router.get('/history',
  mergeController.getMergeHistory
);

router.delete('/history/:jobId',
  idParamValidation,
  validate,
  mergeController.deleteMergeHistory
);

// Preview and validation
router.post('/preview',
  uploadMultiple('files', 10),
  mergeController.generatePreview
);

router.post('/validate',
  uploadMultiple('files', 50),
  mergeController.validateMerge
);

router.get('/options/:fileType',
  mergeController.getMergeOptions
);

module.exports = router;