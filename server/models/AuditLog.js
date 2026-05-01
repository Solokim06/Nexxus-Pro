const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  
  // Action details
  action: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['auth', 'file', 'folder', 'user', 'admin', 'payment', 'subscription', 'security', 'system'],
    required: true,
    index: true,
  },
  
  // Target resource
  targetType: {
    type: String,
    enum: ['user', 'file', 'folder', 'payment', 'subscription', 'api_key', 'system'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  targetName: String,
  
  // Changes (before/after)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  
  // Request info
  ip: String,
  userAgent: String,
  referer: String,
  method: String,
  path: String,
  query: mongoose.Schema.Types.Mixed,
  
  // Result
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
  },
  statusCode: Number,
  error: String,
  errorStack: String,
  
  // Performance
  duration: Number,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static method to create audit entry
auditLogSchema.statics.log = async function(data) {
  return await this.create(data);
};

// Static method to get user audit trail
auditLogSchema.statics.getUserTrail = async function(userId, options = {}) {
  const { limit = 100, startDate, endDate, category } = options;
  
  const query = { userId };
  if (startDate) query.createdAt = { $gte: startDate };
  if (endDate) query.createdAt = { ...query.createdAt, $lte: endDate };
  if (category) query.category = category;
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get system audit trail (admin)
auditLogSchema.statics.getSystemTrail = async function(options = {}) {
  const { limit = 100, startDate, endDate, category, action, userId } = options;
  
  const query = {};
  if (startDate) query.createdAt = { $gte: startDate };
  if (endDate) query.createdAt = { ...query.createdAt, $lte: endDate };
  if (category) query.category = category;
  if (action) query.action = action;
  if (userId) query.userId = userId;
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to get summary by category
auditLogSchema.statics.getSummaryByCategory = async function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { category: '$category', status: '$status' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// Static method to get activity by hour
auditLogSchema.statics.getActivityByHour = async function(days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1, '_id.hour': 1 } },
  ]);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
module.exports = AuditLog;