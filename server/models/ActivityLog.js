const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Action type
  action: {
    type: String,
    required: true,
    index: true,
  },
  
  // Resource
  resourceType: {
    type: String,
    enum: ['file', 'folder', 'user', 'subscription', 'payment', 'merge', 'api'],
  },
  resourceId: String,
  resourceName: String,
  
  // Details
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Request info
  ip: String,
  userAgent: String,
  referer: String,
  
  // Performance
  duration: Number,
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
  },
  error: String,
}, {
  timestamps: true,
});

// Indexes
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1 });
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Static method to create log entry
activityLogSchema.statics.log = async function(data) {
  return await this.create(data);
};

// Method to get user activity summary
activityLogSchema.statics.getUserSummary = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { userId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$createdAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;