const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// User analytics (authenticated users)
router.use(auth);

router.get('/user',
  analyticsController.getUserAnalytics
);

router.get('/user/storage',
  analyticsController.getStorageAnalytics
);

router.get('/user/activity',
  analyticsController.getActivityAnalytics
);

// Admin analytics (admin only)
router.use(authorize('admin'));

router.get('/admin',
  analyticsController.getAdminAnalytics
);

router.get('/realtime',
  analyticsController.getRealtimeAnalytics
);

router.get('/payments',
  analyticsController.getPaymentAnalytics
);

router.get('/users/growth',
  analyticsController.getUserGrowthAnalytics
);

router.get('/files',
  analyticsController.getFileAnalytics
);

router.get('/performance',
  analyticsController.getPerformanceAnalytics
);

// Custom reports
router.post('/reports/generate',
  analyticsController.generateReport
);

router.get('/reports/:reportId',
  analyticsController.getReport
);

router.get('/reports/:reportId/download',
  analyticsController.downloadReport
);

// Track custom event
router.post('/track',
  analyticsController.trackEvent
);

module.exports = router;