const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./emailService');

class NotificationService {
  async createNotification(userId, title, message, type = 'info', metadata = {}) {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      metadata,
    });

    // Send real-time notification via WebSocket if available
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        io.to(`user_${userId}`).emit('new_notification', notification);
      }
    } catch (error) {
      console.error('WebSocket notification failed:', error);
    }

    return notification;
  }

  async createBulkNotifications(userIds, title, message, type = 'info', metadata = {}) {
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      metadata,
    }));

    const created = await Notification.insertMany(notifications);

    // Send real-time notifications
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        userIds.forEach(userId => {
          io.to(`user_${userId}`).emit('new_notification', { title, message, type });
        });
      }
    } catch (error) {
      console.error('WebSocket bulk notification failed:', error);
    }

    return created;
  }

  async getUserNotifications(userId, options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;
    
    const query = { userId };
    if (unreadOnly) query.read = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return {
      notifications,
      total,
      unreadCount,
      hasMore: offset + limit < total,
    };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: Date.now() },
      { new: true }
    );
    return notification;
  }

  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: Date.now() }
    );
    return result.modifiedCount;
  }

  async deleteNotification(notificationId, userId) {
    const result = await Notification.findOneAndDelete({ _id: notificationId, userId });
    return result;
  }

  async deleteAllNotifications(userId) {
    const result = await Notification.deleteMany({ userId });
    return result.deletedCount;
  }

  async getPreferences(userId) {
    const user = await User.findById(userId).select('notificationPreferences');
    return user.notificationPreferences || this.getDefaultPreferences();
  }

  async updatePreferences(userId, preferences) {
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true }
    );
    return user.notificationPreferences;
  }

  getDefaultPreferences() {
    return {
      email: {
        uploads: true,
        merges: true,
        shares: true,
        payments: true,
        subscription: true,
        marketing: false,
      },
      push: {
        uploads: true,
        merges: true,
        shares: true,
        payments: true,
        subscription: true,
      },
      desktop: {
        uploads: false,
        merges: true,
        shares: true,
        payments: true,
        subscription: true,
      },
    };
  }

  async sendPushNotification(userId, title, body, data = {}) {
    const user = await User.findById(userId);
    if (!user || !user.pushSubscription) return;

    // Send push notification using web-push library
    const webpush = require('web-push');
    webpush.setVapidDetails(
      'mailto:support@nexxus-pro.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const payload = JSON.stringify({ title, body, data });
    
    try {
      await webpush.sendNotification(user.pushSubscription, payload);
      return { success: true };
    } catch (error) {
      console.error('Push notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Specific notification creators
  async notifyFileUpload(userId, fileName, fileSize) {
    return this.createNotification(
      userId,
      'File Uploaded',
      `${fileName} (${this.formatFileSize(fileSize)}) has been uploaded successfully`,
      'upload',
      { fileName, fileSize }
    );
  }

  async notifyFileShare(userId, sharedBy, fileName, shareLink) {
    return this.createNotification(
      userId,
      'File Shared With You',
      `${sharedBy} shared "${fileName}" with you`,
      'share',
      { sharedBy, fileName, shareLink }
    );
  }

  async notifyMergeComplete(userId, outputFileName, fileCount) {
    return this.createNotification(
      userId,
      'Merge Complete',
      `Successfully merged ${fileCount} files into "${outputFileName}"`,
      'merge',
      { outputFileName, fileCount }
    );
  }

  async notifyPaymentSuccess(userId, amount, planId) {
    return this.createNotification(
      userId,
      'Payment Successful',
      `Your payment of $${amount} for the ${planId} plan was successful`,
      'payment',
      { amount, planId }
    );
  }

  async notifySubscriptionExpiring(userId, planId, daysLeft) {
    return this.createNotification(
      userId,
      'Subscription Expiring Soon',
      `Your ${planId} plan will expire in ${daysLeft} days`,
      'subscription',
      { planId, daysLeft }
    );
  }

  async notifyStorageWarning(userId, usedPercentage) {
    return this.createNotification(
      userId,
      'Storage Limit Warning',
      `You have used ${usedPercentage}% of your storage. Consider upgrading.`,
      'warning',
      { usedPercentage }
    );
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new NotificationService();