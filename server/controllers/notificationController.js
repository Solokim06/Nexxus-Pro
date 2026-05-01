const Notification = require('../models/Notification');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 50, page = 1, type, unreadOnly = false } = req.query;
    
    const query = { userId: req.user.id };
    if (type && type !== 'all') query.type = type;
    if (unreadOnly === 'true') query.read = false;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
    });
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
exports.getNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    
    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification',
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true, readAt: Date.now() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read',
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: Date.now() }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });
    
    res.json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
    });
  }
};

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    res.json({
      success: true,
      data: user.notificationPreferences || {
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
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences',
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const { email, push, desktop } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user.notificationPreferences) user.notificationPreferences = {};
    if (email) user.notificationPreferences.email = email;
    if (push) user.notificationPreferences.push = push;
    if (desktop) user.notificationPreferences.desktop = desktop;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Preferences updated',
      data: user.notificationPreferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
    });
  }
};

// @desc    Create notification (internal)
exports.createNotification = async (userId, title, message, type, metadata = {}) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      metadata,
    });
    
    // Send real-time notification via WebSocket
    const { getIO } = require('../socket');
    const io = getIO();
    io.to(`user_${userId}`).emit('new_notification', notification);
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// @desc    Send bulk notifications
// @route   POST /api/notifications/bulk
// @access  Private/Admin
exports.sendBulkNotifications = async (req, res) => {
  try {
    const { userIds, title, message, type } = req.body;
    
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      createdBy: req.user.id,
    }));
    
    await Notification.insertMany(notifications);
    
    // Send real-time notifications
    const { getIO } = require('../socket');
    const io = getIO();
    
    userIds.forEach(userId => {
      io.to(`user_${userId}`).emit('new_notification', { title, message, type });
    });
    
    res.json({
      success: true,
      message: `Sent to ${userIds.length} users`,
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
    });
  }
};