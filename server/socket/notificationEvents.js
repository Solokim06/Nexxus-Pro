const { logger } = require('../utils/logger');
const Notification = require('../models/Notification');

class NotificationEvents {
  handle(socket, socketManager) {
    const userId = socket.user.id;

    // Handle get notifications
    socket.on('get_notifications', async (data) => {
      const { limit = 50, offset = 0 } = data;
      
      try {
        const notifications = await Notification.find({ userId })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit);
        
        const unreadCount = await Notification.countDocuments({ 
          userId, 
          read: false 
        });
        
        socket.emit('notifications_list', {
          notifications,
          unreadCount,
          total: notifications.length,
          hasMore: notifications.length === limit
        });
      } catch (error) {
        logger.error('Error fetching notifications:', error);
        socket.emit('notifications_error', { error: error.message });
      }
    });

    // Handle mark as read
    socket.on('mark_notification_read', async (data) => {
      const { notificationId } = data;
      
      try {
        await Notification.findByIdAndUpdate(notificationId, {
          read: true,
          readAt: Date.now()
        });
        
        socket.emit('notification_marked_read', { notificationId });
        
        // Update unread count
        const unreadCount = await Notification.countDocuments({ 
          userId, 
          read: false 
        });
        socket.emit('unread_count_update', { unreadCount });
      } catch (error) {
        logger.error('Error marking notification read:', error);
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle mark all as read
    socket.on('mark_all_notifications_read', async () => {
      try {
        await Notification.updateMany(
          { userId, read: false },
          { read: true, readAt: Date.now() }
        );
        
        socket.emit('all_notifications_marked_read');
        socket.emit('unread_count_update', { unreadCount: 0 });
      } catch (error) {
        logger.error('Error marking all notifications read:', error);
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle delete notification
    socket.on('delete_notification', async (data) => {
      const { notificationId } = data;
      
      try {
        await Notification.findByIdAndDelete(notificationId);
        
        socket.emit('notification_deleted', { notificationId });
        
        // Update unread count
        const unreadCount = await Notification.countDocuments({ 
          userId, 
          read: false 
        });
        socket.emit('unread_count_update', { unreadCount });
      } catch (error) {
        logger.error('Error deleting notification:', error);
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle delete all notifications
    socket.on('delete_all_notifications', async () => {
      try {
        await Notification.deleteMany({ userId });
        
        socket.emit('all_notifications_deleted');
        socket.emit('unread_count_update', { unreadCount: 0 });
      } catch (error) {
        logger.error('Error deleting all notifications:', error);
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle notification preferences update
    socket.on('update_notification_preferences', async (data) => {
      const { preferences } = data;
      
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(userId, {
          notificationPreferences: preferences
        });
        
        socket.emit('notification_preferences_updated', { preferences });
      } catch (error) {
        logger.error('Error updating notification preferences:', error);
        socket.emit('notification_error', { error: error.message });
      }
    });

    // Handle subscribe to push notifications
    socket.on('subscribe_push', async (data) => {
      const { subscription } = data;
      
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(userId, {
          pushSubscription: subscription
        });
        
        socket.emit('push_subscribed', { success: true });
        logger.info(`User ${userId} subscribed to push notifications`);
      } catch (error) {
        logger.error('Error subscribing to push:', error);
        socket.emit('push_error', { error: error.message });
      }
    });

    // Handle unsubscribe from push notifications
    socket.on('unsubscribe_push', async () => {
      try {
        const User = require('../models/User');
        await User.findByIdAndUpdate(userId, {
          $unset: { pushSubscription: 1 }
        });
        
        socket.emit('push_unsubscribed', { success: true });
        logger.info(`User ${userId} unsubscribed from push notifications`);
      } catch (error) {
        logger.error('Error unsubscribing from push:', error);
        socket.emit('push_error', { error: error.message });
      }
    });

    // Handle test notification
    socket.on('test_notification', async () => {
      const notification = {
        title: 'Test Notification',
        message: 'This is a test notification from Nexxus-Pro',
        type: 'info',
        timestamp: new Date().toISOString()
      };
      
      socketManager.sendNotification(userId, notification);
      socket.emit('test_notification_sent', { success: true });
    });

    // Handle typing indicator for chat/ collaboration
    socket.on('typing_start', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId,
        name: socket.user.name,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        userId,
        name: socket.user.name,
        isTyping: false
      });
    });

    // Handle presence update
    socket.on('presence_update', (data) => {
      const { status } = data; // online, away, busy, offline
      
      socket.broadcast.emit('user_presence', {
        userId,
        status,
        timestamp: Date.now()
      });
    });
  }
}

module.exports = new NotificationEvents();