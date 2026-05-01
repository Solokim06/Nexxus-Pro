const File = require('../models/File');
const User = require('../models/User');
const Payment = require('../models/Payment');
const MergeJob = require('../models/MergeJob');
const ActivityLog = require('../models/ActivityLog');

class AnalyticsService {
  async trackEvent(eventName, eventData, userId = null) {
    const event = {
      name: eventName,
      data: eventData,
      userId,
      timestamp: new Date(),
      userAgent: eventData.userAgent,
      ip: eventData.ip,
    };
    
    // Store in database for later analysis
    await ActivityLog.create({
      userId,
      action: eventName,
      details: eventData,
      ip: eventData.ip,
      userAgent: eventData.userAgent,
    });
    
    return event;
  }
  
  async getUserAnalytics(userId, period = '30d') {
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      case '90d': startDate.setDate(startDate.getDate() - 90); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      default: startDate.setDate(startDate.getDate() - 30);
    }
    
    const [fileUploads, storageGrowth, mergeActivity, activitySummary, paymentHistory] = await Promise.all([
      this.getFileUploadsOverTime(userId, startDate, endDate),
      this.getStorageGrowth(userId, startDate, endDate),
      this.getMergeActivity(userId, startDate, endDate),
      this.getActivitySummary(userId, startDate, endDate),
      this.getPaymentHistory(userId),
    ]);
    
    const currentStorage = await File.aggregate([
      { $match: { userId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);
    
    return {
      period,
      dateRange: { start: startDate, end: endDate },
      fileUploads,
      storageGrowth,
      mergeActivity,
      activitySummary,
      paymentHistory,
      currentStorage: {
        total: currentStorage[0]?.total || 0,
        count: currentStorage[0]?.count || 0,
      },
    };
  }
  
  async getFileUploadsOverTime(userId, startDate, endDate) {
    return await File.aggregate([
      {
        $match: {
          userId,
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
  }
  
  async getStorageGrowth(userId, startDate, endDate) {
    const growth = await File.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          dailyTotal: { $sum: '$size' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    let cumulative = 0;
    return growth.map(day => {
      cumulative += day.dailyTotal;
      return { date: day._id, total: cumulative };
    });
  }
  
  async getMergeActivity(userId, startDate, endDate) {
    return await MergeJob.aggregate([
      {
        $match: {
          userId,
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
  }
  
  async getActivitySummary(userId, startDate, endDate) {
    return await ActivityLog.aggregate([
      {
        $match: {
          userId,
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
  }
  
  async getPaymentHistory(userId) {
    return await Payment.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10);
  }
  
  async getSystemAnalytics(startDate, endDate) {
    const [userGrowth, revenueData, fileStats, mergeStats, paymentMethods] = await Promise.all([
      this.getUserGrowth(startDate, endDate),
      this.getRevenueData(startDate, endDate),
      this.getSystemFileStats(),
      this.getSystemMergeStats(startDate, endDate),
      this.getPaymentMethodDistribution(),
    ]);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });
    
    const totalUsers = await User.countDocuments();
    const totalStorage = await File.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    
    return {
      userGrowth,
      revenueData,
      fileStats,
      mergeStats,
      paymentMethods,
      activeUsers,
      totalUsers,
      totalStorage: totalStorage[0]?.total || 0,
    };
  }
  
  async getUserGrowth(startDate, endDate) {
    return await User.aggregate([
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
  }
  
  async getRevenueData(startDate, endDate) {
    return await Payment.aggregate([
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
  }
  
  async getSystemFileStats() {
    const stats = await File.aggregate([
      {
        $group: {
          _id: '$mimeType',
          count: { $sum: 1 },
          size: { $sum: '$size' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    const totalFiles = await File.countDocuments();
    const totalSize = await File.aggregate([
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    
    return {
      byType: stats,
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
    };
  }
  
  async getSystemMergeStats(startDate, endDate) {
    return await MergeJob.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }
  
  async getPaymentMethodDistribution() {
    return await Payment.aggregate([
      {
        $match: { status: 'completed' },
      },
      {
        $group: {
          _id: '$method',
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
  }
  
  async getRealtimeStats() {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    
    const [activeUsers, recentUploads, recentPayments, recentMerges] = await Promise.all([
      ActivityLog.distinct('userId', { createdAt: { $gte: lastHour } }),
      File.countDocuments({ createdAt: { $gte: lastHour } }),
      Payment.countDocuments({ createdAt: { $gte: lastHour }, status: 'completed' }),
      MergeJob.countDocuments({ createdAt: { $gte: lastHour } }),
    ]);
    
    return {
      timestamp: new Date(),
      activeUsers: activeUsers.length,
      recentUploads,
      recentPayments,
      recentMerges,
    };
  }
  
  async getTopUsers(limit = 10) {
    const topUploaders = await File.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 }, size: { $sum: '$size' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    ]);
    
    const topMergers = await MergeJob.aggregate([
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    ]);
    
    return { topUploaders, topMergers };
  }
}

module.exports = new AnalyticsService();