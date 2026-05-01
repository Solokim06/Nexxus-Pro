const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const Session = require('../models/Session');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { logger } = require('../utils/logger');

class CleanupJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      await this.run();
    });
    
    logger.info('Cleanup job scheduled to run every hour');
  }

  async run() {
    if (this.isRunning) {
      logger.warn('Cleanup job already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('Starting cleanup job...');

    try {
      await this.cleanupTempFiles();
      await this.cleanupDeletedFiles();
      await this.cleanupExpiredSessions();
      await this.cleanupOldActivityLogs();
      await this.cleanupOldNotifications();
      await this.cleanupExpiredShares();
      await this.cleanupUnverifiedUsers();
      
      logger.info('Cleanup job completed successfully');
    } catch (error) {
      logger.error('Cleanup job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async cleanupTempFiles() {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      // Delete files older than 24 hours
      if (age > 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} temp files`);
    }
  }

  async cleanupDeletedFiles() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find files deleted more than 30 days ago
    const files = await File.find({
      isDeleted: true,
      deletedAt: { $lt: thirtyDaysAgo }
    });

    let deletedCount = 0;
    for (const file of files) {
      // Delete from storage
      const storageService = require('../services/storageService');
      await storageService.deleteFromStorage(file.path);
      if (file.thumbnail) {
        await storageService.deleteFromStorage(file.thumbnail);
      }
      
      // Remove from database
      await file.remove();
      deletedCount++;
    }

    if (deletedCount > 0) {
      logger.info(`Permanently deleted ${deletedCount} files`);
    }
  }

  async cleanupExpiredSessions() {
    const result = await Session.deleteMany({
      expiresAt: { $lt: Date.now() }
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
    }
  }

  async cleanupOldActivityLogs() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await ActivityLog.deleteMany({
      createdAt: { $lt: ninetyDaysAgo }
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old activity logs`);
    }
  }

  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      read: true
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} old notifications`);
    }
  }

  async cleanupExpiredShares() {
    const result = await File.updateMany(
      { shareExpires: { $lt: Date.now() }, isPublic: true },
      { isPublic: false, $unset: { shareToken: 1, shareExpires: 1 } }
    );
    
    if (result.modifiedCount > 0) {
      logger.info(`Cleaned up ${result.modifiedCount} expired shares`);
    }
  }

  async cleanupUnverifiedUsers() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const User = require('../models/User');
    
    const result = await User.deleteMany({
      isEmailVerified: false,
      createdAt: { $lt: sevenDaysAgo }
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} unverified users`);
    }
  }
}

module.exports = new CleanupJob();