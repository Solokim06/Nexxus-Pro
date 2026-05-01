const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, authorize } = require('../middleware/auth');
const { validate, paginationValidation, idParamValidation } = require('../middleware/validation');
const { adminCors } = require('../middleware/cors');

// All routes require admin authentication
router.use(auth);
router.use(authorize('admin'));
router.use(adminCors);

// User management
router.get('/users', 
  paginationValidation,
  validate,
  adminController.getAllUsers
);

router.get('/users/:id',
  idParamValidation,
  validate,
  adminController.getUserById
);

router.put('/users/:id',
  idParamValidation,
  validate,
  adminController.updateUser
);

router.delete('/users/:id',
  idParamValidation,
  validate,
  adminController.deleteUser
);

// System statistics
router.get('/stats',
  adminController.getSystemStats
);

router.get('/analytics',
  adminController.getSystemAnalytics
);

// System logs
router.get('/logs',
  paginationValidation,
  validate,
  adminController.getSystemLogs
);

router.get('/logs/:category',
  adminController.getLogsByCategory
);

// Broadcast
router.post('/broadcast',
  adminController.broadcastNotification
);

// System settings
router.get('/settings',
  adminController.getSystemSettings
);

router.put('/settings',
  adminController.updateSystemSettings
);

// Maintenance mode
router.post('/maintenance',
  adminController.toggleMaintenanceMode
);

// Backup and restore
router.post('/backup',
  adminController.createBackup
);

router.post('/restore',
  adminController.restoreBackup
);

router.get('/backups',
  adminController.getBackups
);

// Queue management
router.get('/queue',
  adminController.getQueueStatus
);

router.post('/queue/process',
  adminController.processQueue
);

router.delete('/queue/:jobId',
  adminController.clearQueueJob
);

module.exports = router;