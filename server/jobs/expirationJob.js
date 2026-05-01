const cron = require('node-cron');
const File = require('../models/File');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Invitation = require('../models/Invitation');
const { sendEmail } = require('../services/emailService');
const { logger } = require('../utils/logger');

class ExpirationJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      await this.processExpirations();
    });
    
    logger.info('Expiration jobs scheduled');
  }

  async processExpirations() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    try {
      await this.processExpiredFiles();
      await this.processExpiredShares();
      await this.processExpiredInvitations();
      await this.processExpiredSubscriptions();
      await this.processExpiredSessions();
      
      logger.info('Expiration processing completed');
    } catch (error) {
      logger.error('Expiration processing error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async processExpiredFiles() {
    const now = new Date();
    
    const expiredFiles = await File.find({
      expiresAt: { $lt: now },
      isDeleted: false
    });
    
    for (const file of expiredFiles) {
      file.isDeleted = true;
      file.deletedAt = now;
      file.deletedReason = 'File expired';
      await file.save();
      
      logger.info(`File expired: ${file.name} (${file._id})`);
      
      // Notify user
      const user = await User.findById(file.userId);
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'File Expired - Nexxus-Pro',
          template: 'file-expired',
          data: {
            name: user.name,
            fileName: file.name,
            expiryDate: file.expiresAt
          }
        });
      }
    }
    
    if (expiredFiles.length > 0) {
      logger.info(`Processed ${expiredFiles.length} expired files`);
    }
  }

  async processExpiredShares() {
    const now = new Date();
    
    const expiredShares = await File.find({
      shareExpires: { $lt: now },
      isPublic: true
    });
    
    for (const file of expiredShares) {
      file.isPublic = false;
      file.shareToken = null;
      file.shareExpires = null;
      await file.save();
      
      logger.info(`Share expired for file: ${file.name} (${file._id})`);
    }
    
    if (expiredShares.length > 0) {
      logger.info(`Processed ${expiredShares.length} expired shares`);
    }
  }

  async processExpiredInvitations() {
    const now = new Date();
    
    const expiredInvitations = await Invitation.find({
      expiresAt: { $lt: now },
      status: 'pending'
    });
    
    for (const invitation of expiredInvitations) {
      invitation.status = 'expired';
      await invitation.save();
      
      logger.info(`Invitation expired: ${invitation.email} (${invitation._id})`);
    }
    
    if (expiredInvitations.length > 0) {
      logger.info(`Processed ${expiredInvitations.length} expired invitations`);
    }
  }

  async processExpiredSubscriptions() {
    const now = new Date();
    
    const expiredSubscriptions = await Subscription.find({
      endDate: { $lt: now },
      status: 'active'
    }).populate('userId');
    
    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await subscription.save();
      
      // Downgrade user to free plan
      await User.findByIdAndUpdate(subscription.userId._id, {
        subscriptionPlan: 'free'
      });
      
      logger.info(`Subscription expired for user: ${subscription.userId.email}`);
      
      // Send notification
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Expired - Nexxus-Pro',
        template: 'subscription-expired',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId
        }
      });
    }
    
    if (expiredSubscriptions.length > 0) {
      logger.info(`Processed ${expiredSubscriptions.length} expired subscriptions`);
    }
  }

  async processExpiredSessions() {
    const Session = require('../models/Session');
    const now = Date.now();
    
    const result = await Session.deleteMany({
      expiresAt: { $lt: now }
    });
    
    if (result.deletedCount > 0) {
      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
    }
  }
}

module.exports = new ExpirationJob();