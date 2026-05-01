const File = require('../models/File');
const Payment = require('../models/Payment');
const User = require('../models/User');
const MergeJob = require('../models/MergeJob');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get user analytics
// @route   GET /api/analytics/user
// @access  Private
exports.getUserAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // File uploads over time
    const fileUploads = await File.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // File types distribution
    const fileTypes = await File.aggregate([
      {
        $match: {
          userId: req.user.id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$mimeType', regex: /^image/ } }, then: 'images' },
                { case: { $regexMatch: { input: '$mimeType', regex: /^video/ } }, then: 'videos' },
                { case: { $regexMatch: { input: '$mimeType', regex: /^audio/ } }, then: 'audio' },
                { case: { $eq: ['$mimeType', 'application/pdf'] }, then: 'pdfs' },
                { case: { $regexMatch: { input: '$mimeType', regex: /document/ } }, then: 'documents' },
              ],
              default: 'other',
            },
          },
          count: { $sum: 1 },
          size: { $sum: '$size' },
        },
      },
    ]);
    
    // Storage growth
    const storageGrowth = await File.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyTotal: { $sum: '$size' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);
    
    // Calculate cumulative storage
    let cumulative = 0;
    const cumulativeStorage = storageGrowth.map(day => {
      cumulative += day.dailyTotal;
      return { date: day._id, total: cumulative };
    });
    
    // Merge activity
    const mergeActivity = await MergeJob.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // User activity summary
    const activitySummary = await ActivityLog.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);
    
    // Daily active usage
    const activeDays = await ActivityLog.aggregate([
      {
        $match: {
          userId: req.user.id,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          actions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Current storage usage
    const currentStorage = await File.aggregate([
      {
        $match: {
          userId: req.user.id,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$size' },
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        fileUploads,
        fileTypes,
        storageGrowth: cumulativeStorage,
        mergeActivity,
        activitySummary,
        activeDays: activeDays.length,
        currentStorage: {
          total: currentStorage[0]?.total || 0,
          count: currentStorage[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
    });
  }
};

// @desc    Get admin analytics (system-wide)
// @route   GET /api/analytics/admin
// @access  Private/Admin
exports.getAdminAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const endDate = new Date();
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - (period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365));
    
    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Revenue over time
    const revenueData = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Payment method distribution
    const paymentMethods = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
        },
      },
      {
        $group: {
          _id: '$method',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Subscription distribution
    const subscriptionDistribution = await User.aggregate([
      {
        $group: {
          _id: '$subscriptionPlan',
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Top users by activity
    const topUsers = await ActivityLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$userId',
          actionCount: { $sum: 1 },
        },
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
    ]);
    
    // System health metrics
    const totalFiles = await File.countDocuments();
    const totalStorage = await File.aggregate([
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    
    res.json({
      success: true,
      data: {
        period,
        userGrowth,
        revenueData,
        paymentMethods,
        subscriptionDistribution,
        topUsers,
        systemMetrics: {
          totalUsers,
          activeUsers,
          totalFiles,
          totalStorage: totalStorage[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get admin analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin analytics',
    });
  }
};

// @desc    Get real-time analytics
// @route   GET /api/analytics/realtime
// @access  Private/Admin
exports.getRealtimeAnalytics = async (req, res) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    
    const [activeUsers, recentUploads, recentPayments, recentMerges] = await Promise.all([
      ActivityLog.distinct('userId', { createdAt: { $gte: lastHour } }),
      File.countDocuments({ createdAt: { $gte: lastHour } }),
      Payment.countDocuments({ createdAt: { $gte: lastHour }, status: 'completed' }),
      MergeJob.countDocuments({ createdAt: { $gte: lastHour } }),
    ]);
    
    res.json({
      success: true,
      data: {
        timestamp: new Date(),
        activeUsers: activeUsers.length,
        recentUploads,
        recentPayments,
        recentMerges,
      },
    });
  } catch (error) {
    console.error('Get realtime analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get realtime analytics',
    });
  }
};

// @desc    Track custom event
// @route   POST /api/analytics/track
// @access  Private
exports.trackEvent = async (req, res) => {
  try {
    const { eventName, eventData } = req.body;
    
    await createAuditLog({
      userId: req.user.id,
      action: eventName,
      details: eventData,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
    });
  }
};