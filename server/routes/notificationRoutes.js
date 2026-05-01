const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { auth, authorize } = require('../middleware/auth');
const { validate, paginationValidation, idParamValidation } = require('../middleware/validation');

// All routes require authentication
router.use(auth);

// Get notifications
router.get('/',
  paginationValidation,
  validate,
  notificationController.getNotifications
);

router.get('/unread/count',
  notificationController.getUnreadCount
);

router.get('/:id',
  idParamValidation,
  validate,
  notificationController.getNotification
);

// Update notifications
router.put('/:id/read',
  idParamValidation,
  validate,
  notificationController.markAsRead
);

router.put('/read-all',
  notificationController.markAllAsRead
);

// Delete notifications
router.delete('/:id',
  idParamValidation,
  validate,
  notificationController.deleteNotification
);

router.delete('/',
  notificationController.deleteAllNotifications
);

// Preferences
router.get('/preferences',
  notificationController.getPreferences
);

router.put('/preferences',
  notificationController.updatePreferences
);

// Push notification registration
router.post('/push/register',
  notificationController.registerPushToken
);

router.delete('/push/unregister',
  notificationController.unregisterPushToken
);

// Admin broadcast (admin only)
router.use(authorize('admin'));

router.post('/broadcast',
  notificationController.broadcastNotification
);

router.post('/send',
  notificationController.sendNotification
);

module.exports = router;