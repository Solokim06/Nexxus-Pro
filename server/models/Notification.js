const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Notification content
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'upload', 'merge', 'payment', 'subscription', 'share'],
    default: 'info',
  },
  
  // Status
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,
  
  // Action/Link
  actionUrl: String,
  actionText: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Priority
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
  },
  
  // Expiration
  expiresAt: Date,
  
  // Who created (system or admin)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  return await this.create(data);
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, read: false },
    { read: true, readAt: Date.now() }
  );
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = Date.now();
  await this.save();
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
