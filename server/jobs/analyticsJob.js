const cron = require('node-cron');
const User = require('../models/User');
const File = require('../models/File');
const Payment = require('../models/Payment');
const MergeJob = require('../models/MergeJob');
const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../utils/logger');

class AnalyticsJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run daily at 1 AM
    cron.schedule('0 1 * * *', async () => {
      await this.runDailyAnalytics();
    });
    
    // Run hourly for real-time stats
    cron.schedule('0 * * * *', async () => {
      await this.runHourlyAnalytics();
    });
    
    logger.info('Analytics jobs scheduled');
  }

  async runDailyAnalytics() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting daily analytics aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const analytics = {
        date: yesterday,
        users: await this.getUserStats(yesterday, today),
        files: await this.getFileStats(yesterday, today),
        payments: await this.getPaymentStats(yesterday, today),
        merges: await this.getMergeStats(yesterday, today),
        activity: await this.getActivityStats(yesterday, today),
      };

      await this.saveAnalytics(analytics);
      logger.info('Daily analytics completed', analytics);
    } catch (error) {
      logger.error('Daily analytics failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runHourlyAnalytics() {
    try {
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      const now = new Date();

      const stats = {
        timestamp: now,
        activeUsers: await this.getActiveUsers(lastHour, now),
        newUsers: await User.countDocuments({ createdAt: { $gte: lastHour } }),
        newFiles: await File.countDocuments({ createdAt: { $gte: lastHour } }),
        newPayments: await Payment.countDocuments({ createdAt: { $gte: lastHour } }),
        newMerges: await MergeJob.countDocuments({ createdAt: { $gte: lastHour } }),
      };

      await this.saveHourlyStats(stats);
      logger.info('Hourly analytics completed', stats);
    } catch (error) {
      logger.error('Hourly analytics failed:', error);
    }
  }

  async getUserStats(startDate, endDate) {
    const [newUsers, activeUsers, usersByPlan] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ lastLogin: { $gte: startDate, $lte: endDate } }),
      User.aggregate([
        { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
      ])
    ]);

    return { newUsers, activeUsers, usersByPlan };
  }

  async getFileStats(startDate, endDate) {
    const [newFiles, totalSize, filesByType] = await Promise.all([
      File.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      File.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$size' } } }
      ]),
      File.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$mimeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      newFiles,
      totalSize: totalSize[0]?.total || 0,
      filesByType
    };
  }

  async getPaymentStats(startDate, endDate) {
    const [totalRevenue, paymentsByMethod, successfulPayments, failedPayments] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'completed', completedAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$method', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({ status: 'completed', completedAt: { $gte: startDate, $lte: endDate } }),
      Payment.countDocuments({ status: 'failed', createdAt: { $gte: startDate, $lte: endDate } })
    ]);

    return {
      totalRevenue: totalRevenue[0]?.total || 0,
      paymentsByMethod,
      successfulPayments,
      failedPayments
    };
  }

  async getMergeStats(startDate, endDate) {
    const [totalMerges, successfulMerges, failedMerges, mergesByFormat] = await Promise.all([
      MergeJob.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      MergeJob.countDocuments({ status: 'completed', createdAt: { $gte: startDate, $lte: endDate } }),
      MergeJob.countDocuments({ status: 'failed', createdAt: { $gte: startDate, $lte: endDate } }),
      MergeJob.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$outputFormat', count: { $sum: 1 } } }
      ])
    ]);

    return {
      totalMerges,
      successfulMerges,
      failedMerges,
      mergesByFormat
    };
  }

  async getActivityStats(startDate, endDate) {
    const topActions = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const uniqueUsers = await ActivityLog.distinct('userId', {
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return {
      topActions,
      uniqueUsers: uniqueUsers.length
    };
  }

  async getActiveUsers(startDate, endDate) {
    return await ActivityLog.distinct('userId', {
      createdAt: { $gte: startDate, $lte: endDate }
    }).then(users => users.length);
  }

  async saveAnalytics(analytics) {
    const Analytics = require('../models/Analytics');
    await Analytics.create(analytics);
  }

  async saveHourlyStats(stats) {
    const HourlyStats = require('../models/HourlyStats');
    await HourlyStats.create(stats);
  }
}

module.exports = new AnalyticsJob();